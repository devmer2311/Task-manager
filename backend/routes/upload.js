import express from 'express';
import multer from 'multer';
import csv from 'csv-parser';
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import List from '../models/List.js';
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
const distributeItems = (items, agents) => {
  const distribution = [];
  const itemsPerAgent = Math.floor(items.length / agents.length);
  const remainder = items.length % agents.length;

  let currentIndex = 0;

  agents.forEach((agent, agentIndex) => {
    const itemsForThisAgent = itemsPerAgent + (agentIndex < remainder ? 1 : 0);
    const agentItems = items.slice(currentIndex, currentIndex + itemsForThisAgent);
    
    if (agentItems.length > 0) {
      distribution.push({
        agentId: agent._id,
        agentName: agent.name,
        agentEmail: agent.email,
        items: agentItems,
        count: agentItems.length
      });
    }
    
    currentIndex += itemsForThisAgent;
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
    const distribution = distributeItems(normalizedData, agents);

    // Save distributed lists to database
    const savedLists = [];
    for (const dist of distribution) {
      const listData = {
        agentId: dist.agentId,
        items: dist.items,
        uploadedBy: req.user._id,
        uploadedAt: new Date(),
        fileName: req.file.originalname,
        totalItems: dist.count
      };

      const savedList = await List.create(listData);
      savedLists.push({
        ...dist,
        listId: savedList._id
      });
    }

    // Clean up uploaded file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({
      success: true,
      message: `Successfully processed ${normalizedData.length} items and distributed among ${agents.length} agents`,
      data: {
        totalItems: normalizedData.length,
        agentsCount: agents.length,
        distribution: savedLists,
        fileName: req.file.originalname
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

// Get distributed lists
router.get('/lists', adminAuth, async (req, res) => {
  try {
    const lists = await List.find()
      .populate('agentId', 'name email')
      .populate('uploadedBy', 'name email')
      .sort({ uploadedAt: -1 });
    
    res.json(lists);
  } catch (error) {
    console.error('Get lists error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;