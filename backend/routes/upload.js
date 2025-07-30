import express from 'express';
import multer from 'multer';
import csv from 'csv-parser';
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import List from '../models/List.js';
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

// Distribute items among agents
const distributeItemsAsTasks = (items, agents) => {
  const tasks = [];
  let currentAgentIndex = 0;

  // Distribute items one by one to agents in round-robin fashion
  items.forEach((item, index) => {
    const agent = agents[currentAgentIndex];
    
    tasks.push({
      agentId: agent._id,
      agentName: agent.name,
      agentEmail: agent.email,
      item: item,
      taskIndex: index + 1
    });
    
    // Move to next agent, wrap around if at the end
    currentAgentIndex = (currentAgentIndex + 1) % agents.length;
  });

  return tasks;
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
        errors: ['Please create at least one active agent before uploading lists']
      });
    }

    // Normalize data format
    const normalizedData = data.map((row, index) => ({
      firstName: (row.FirstName || row.firstname || row.Firstname || '').toString().trim(),
      phone: (row.Phone || row.phone || '').toString().trim(),
      notes: (row.Notes || row.notes || '').toString().trim(),
      originalRow: index + 1
    }));

    // Distribute items among agents
    const distributedTasks = distributeItemsAsTasks(normalizedData, agents);

    // Create individual tasks for each item
    const createdTasks = [];
    for (const taskData of distributedTasks) {
      const task = new Task({
        title: `Contact: ${taskData.item.firstName}`,
        description: `Contact ${taskData.item.firstName} at ${taskData.item.phone}${taskData.item.notes ? `\n\nNotes: ${taskData.item.notes}` : ''}`,
        agentId: taskData.agentId,
        status: 'pending',
        priority: 'medium',
        assignedBy: req.user._id,
        metadata: {
          firstName: taskData.item.firstName,
          phone: taskData.item.phone,
          notes: taskData.item.notes,
          originalRow: taskData.item.originalRow,
          fileName: req.file.originalname,
          uploadedAt: new Date()
        }
      });

      const savedTask = await task.save();
      createdTasks.push({
        taskId: savedTask._id,
        agentName: taskData.agentName,
        agentEmail: taskData.agentEmail,
        firstName: taskData.item.firstName,
        phone: taskData.item.phone
      });
    }

    // Group tasks by agent for summary
    const tasksByAgent = createdTasks.reduce((acc, task) => {
      const key = `${task.agentName} (${task.agentEmail})`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(task);
      return acc;
    }, {});

    // Clean up uploaded file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({
      success: true,
      message: `Successfully created ${normalizedData.length} tasks and distributed among ${agents.length} agents`,
      data: {
        totalTasks: normalizedData.length,
        agentsCount: agents.length,
        fileName: req.file.originalname,
        tasksByAgent: Object.keys(tasksByAgent).map(agentKey => ({
          agent: agentKey,
          taskCount: tasksByAgent[agentKey].length,
          tasks: tasksByAgent[agentKey].slice(0, 3) // Show first 3 tasks as preview
        }))
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

// Get upload history and task distribution
router.get('/history', adminAuth, async (req, res) => {
  try {
    // Get tasks created from uploads
    const uploadTasks = await Task.find({ 
      'metadata.fileName': { $exists: true } 
    })
      .populate('agentId', 'name email')
      .populate('assignedBy', 'name email')
      .sort({ createdAt: -1 });

    // Group by file upload
    const uploadHistory = uploadTasks.reduce((acc, task) => {
      const fileName = task.metadata.fileName;
      const uploadedAt = task.metadata.uploadedAt;
      const key = `${fileName}_${uploadedAt}`;
      
      if (!acc[key]) {
        acc[key] = {
          fileName,
          uploadedAt,
          uploadedBy: task.assignedBy,
          totalTasks: 0,
          completedTasks: 0,
          agents: {}
        };
      }
      
      acc[key].totalTasks++;
      if (task.status === 'completed') {
        acc[key].completedTasks++;
      }
      
      const agentKey = task.agentId._id.toString();
      if (!acc[key].agents[agentKey]) {
        acc[key].agents[agentKey] = {
          name: task.agentId.name,
          email: task.agentId.email,
          taskCount: 0,
          completedCount: 0
        };
      }
      
      acc[key].agents[agentKey].taskCount++;
      if (task.status === 'completed') {
        acc[key].agents[agentKey].completedCount++;
      }
      
      return acc;
    }, {});

    const history = Object.values(uploadHistory).map(upload => ({
      ...upload,
      agents: Object.values(upload.agents)
    }));
    
    res.json(history);
  } catch (error) {
    console.error('Get upload history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
