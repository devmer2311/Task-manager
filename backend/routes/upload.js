import express from 'express';
import multer from 'multer';
import csv from 'csv-parser';
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import Task from '../models/Task.js';
import { adminAuth } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (allowedTypes.includes(file.mimetype) || 
        file.originalname.endsWith('.csv') || 
        file.originalname.endsWith('.xlsx') || 
        file.originalname.endsWith('.xls')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV and Excel files are allowed.'));
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Parse CSV file
const parseCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
};

// Parse Excel file
const parseExcel = (filePath) => {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(worksheet);
  } catch (error) {
    throw new Error('Failed to parse Excel file');
  }
};

// Validate CSV format
const validateCSVFormat = (data) => {
  const errors = [];
  const requiredFields = ['FirstName', 'Phone', 'Notes'];
  
  if (!data || data.length === 0) {
    errors.push('File is empty or contains no valid data');
    return { isValid: false, errors };
  }

  // Check if all required columns exist in the first row
  const firstRow = data[0];
  const availableFields = Object.keys(firstRow);
  
  const missingFields = requiredFields.filter(field => 
    !availableFields.some(available => 
      available.toLowerCase().trim() === field.toLowerCase()
    )
  );

  if (missingFields.length > 0) {
    errors.push(`Missing required columns: ${missingFields.join(', ')}`);
  }

  // Check for extra columns
  const normalizedRequired = requiredFields.map(f => f.toLowerCase());
  const extraFields = availableFields.filter(field => 
    !normalizedRequired.includes(field.toLowerCase().trim())
  );

  if (extraFields.length > 0) {
    errors.push(`Unexpected columns found: ${extraFields.join(', ')}. Only FirstName, Phone, and Notes are allowed.`);
  }

  // Validate each row
  data.forEach((row, index) => {
    const rowNumber = index + 1;
    
    // Check FirstName
    const firstName = row.FirstName || row.firstname || row.Firstname;
    if (!firstName || firstName.toString().trim() === '') {
      errors.push(`Row ${rowNumber}: FirstName is required`);
    }

    // Check Phone
    const phone = row.Phone || row.phone;
    if (!phone || phone.toString().trim() === '') {
      errors.push(`Row ${rowNumber}: Phone is required`);
    } else {
      // Basic phone validation (numbers, spaces, dashes, parentheses, plus sign)
      const phoneStr = phone.toString().trim();
      const phoneRegex = /^[\+]?[\d\s\-\(\)]+$/;
      if (!phoneRegex.test(phoneStr)) {
        errors.push(`Row ${rowNumber}: Phone number format is invalid`);
      }
    }

    // Notes is optional but should be a string if provided
    const notes = row.Notes || row.notes || '';
    if (notes && typeof notes !== 'string' && typeof notes !== 'number') {
      errors.push(`Row ${rowNumber}: Notes must be text`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Round-robin distribution algorithm
const distributeTasksRoundRobin = (tasks, agents) => {
  const distribution = [];
  let currentAgentIndex = 0;

  tasks.forEach((task, index) => {
    const agent = agents[currentAgentIndex];
    
    distribution.push({
      agentId: agent._id,
      agentName: agent.name,
      agentEmail: agent.email,
      task: task,
      taskIndex: index + 1
    });

    // Move to next agent in round-robin fashion
    currentAgentIndex = (currentAgentIndex + 1) % agents.length;
  });

  return distribution;
};

// Upload and process CSV file
router.post('/', adminAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        message: 'No file uploaded',
        errors: ['Please select a CSV or Excel file to upload']
      });
    }

    const filePath = req.file.path;
    let data = [];

    // Parse file based on type
    try {
      if (req.file.mimetype === 'text/csv' || req.file.originalname.endsWith('.csv')) {
        data = await parseCSV(filePath);
      } else {
        data = parseExcel(filePath);
      }
    } catch (parseError) {
      // Clean up file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return res.status(400).json({
        success: false,
        message: 'Failed to parse file',
        errors: ['File format is invalid or corrupted']
      });
    }

    // Validate CSV format
    const validation = validateCSVFormat(data);
    if (!validation.isValid) {
      // Clean up file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return res.status(400).json({
        success: false,
        message: 'CSV validation failed',
        errors: validation.errors
      });
    }

    // Get active agents
    const agents = await User.find({ role: 'agent', isActive: true });

    if (agents.length === 0) {
      // Clean up file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return res.status(400).json({
        success: false,
        message: 'No active agents available',
        errors: ['Please create at least one active agent before uploading tasks']
      });
    }

    // Normalize data format
    const normalizedData = data.map((row, index) => ({
      firstName: (row.FirstName || row.firstname || row.Firstname || '').toString().trim(),
      phone: (row.Phone || row.phone || '').toString().trim(),
      notes: (row.Notes || row.notes || '').toString().trim(),
      originalRow: index + 1
    }));

    // Distribute tasks using round-robin algorithm
    const distribution = distributeTasksRoundRobin(normalizedData, agents);

    // Create tasks in database
    const createdTasks = [];
    const agentTaskCounts = {};

    for (const dist of distribution) {
      const taskData = {
        title: `Contact: ${dist.task.firstName}`,
        description: `Name: ${dist.task.firstName}\nPhone: ${dist.task.phone}\nNotes: ${dist.task.notes || 'No additional notes'}`,
        agentId: dist.agentId,
        status: 'pending',
        priority: 'medium',
        assignedBy: req.user._id,
        metadata: {
          firstName: dist.task.firstName,
          phone: dist.task.phone,
          notes: dist.task.notes,
          originalRow: dist.task.originalRow,
          fileName: req.file.originalname,
          uploadedAt: new Date()
        }
      };

      const createdTask = await Task.create(taskData);
      createdTasks.push(createdTask);

      // Count tasks per agent
      if (!agentTaskCounts[dist.agentId]) {
        agentTaskCounts[dist.agentId] = {
          agentName: dist.agentName,
          agentEmail: dist.agentEmail,
          count: 0
        };
      }
      agentTaskCounts[dist.agentId].count++;
    }

    // Clean up uploaded file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Prepare response data
    const distributionSummary = Object.values(agentTaskCounts);

    res.json({
      success: true,
      message: `Successfully processed ${normalizedData.length} tasks and distributed among ${agents.length} agents using round-robin algorithm`,
      data: {
        totalTasks: normalizedData.length,
        agentsCount: agents.length,
        distribution: distributionSummary,
        fileName: req.file.originalname,
        uploadedAt: new Date(),
        createdTasks: createdTasks.length
      }
    });

  } catch (error) {
    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    console.error('Upload error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during file processing',
      errors: [error.message || 'Internal server error']
    });
  }
});

// Get upload history
router.get('/history', adminAuth, async (req, res) => {
  try {
    // Get tasks that were created from file uploads (have metadata.fileName)
    const uploadHistory = await Task.aggregate([
      {
        $match: {
          'metadata.fileName': { $exists: true }
        }
      },
      {
        $group: {
          _id: {
            fileName: '$metadata.fileName',
            uploadedAt: '$metadata.uploadedAt'
          },
          totalTasks: { $sum: 1 },
          completedTasks: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          pendingTasks: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          inProgressTasks: {
            $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] }
          },
          assignedBy: { $first: '$assignedBy' },
          agents: { $addToSet: '$agentId' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'assignedBy',
          foreignField: '_id',
          as: 'uploadedBy'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'agents',
          foreignField: '_id',
          as: 'assignedAgents'
        }
      },
      {
        $project: {
          fileName: '$_id.fileName',
          uploadedAt: '$_id.uploadedAt',
          totalTasks: 1,
          completedTasks: 1,
          pendingTasks: 1,
          inProgressTasks: 1,
          completionRate: {
            $multiply: [
              { $divide: ['$completedTasks', '$totalTasks'] },
              100
            ]
          },
          uploadedBy: { $arrayElemAt: ['$uploadedBy.name', 0] },
          agentsCount: { $size: '$assignedAgents' },
          assignedAgents: {
            $map: {
              input: '$assignedAgents',
              as: 'agent',
              in: {
                name: '$$agent.name',
                email: '$$agent.email'
              }
            }
          }
        }
      },
      {
        $sort: { uploadedAt: -1 }
      }
    ]);
    
    res.json(uploadHistory);
  } catch (error) {
    console.error('Get upload history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get tasks by upload (for detailed view)
router.get('/history/:fileName', adminAuth, async (req, res) => {
  try {
    const { fileName } = req.params;
    
    const tasks = await Task.find({
      'metadata.fileName': fileName
    })
    .populate('agentId', 'name email')
    .populate('assignedBy', 'name email')
    .sort({ createdAt: 1 });
    
    res.json(tasks);
  } catch (error) {
    console.error('Get tasks by upload error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
