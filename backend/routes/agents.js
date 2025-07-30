import express from 'express';
import User from '../models/User.js';
import { adminAuth } from '../middleware/auth.js';

const router = express.Router();

// Get all agents (admin only)
router.get('/', adminAuth, async (req, res) => {
  try {
    const agents = await User.find({ role: 'agent' })
      .select('-password')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    
    res.json(agents);
  } catch (error) {
    console.error('Get agents error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create agent (admin only)
router.post('/', adminAuth, async (req, res) => {
  try {
    const { name, email, password, countryCode, mobile } = req.body;

    // Validation
    const errors = [];
    
    if (!name || name.trim() === '') {
      errors.push('Name is required');
    }
    
    if (!email || email.trim() === '') {
      errors.push('Email is required');
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.push('Please enter a valid email address');
      }
    }
    
    if (!password || password.length < 6) {
      errors.push('Password must be at least 6 characters long');
    }
    
    if (!countryCode || countryCode.trim() === '') {
      errors.push('Country code is required');
    }
    
    if (!mobile || mobile.trim() === '') {
      errors.push('Mobile number is required');
    } else {
      const mobileRegex = /^[\d\s\-\(\)]+$/;
      if (!mobileRegex.test(mobile)) {
        errors.push('Please enter a valid mobile number');
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors 
      });
    }

    // Check if agent already exists
    const existingAgent = await User.findOne({ email: email.toLowerCase() });
    if (existingAgent) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: ['Agent with this email already exists'] 
      });
    }

    // Create new agent
    const agent = new User({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      countryCode: countryCode || '+1',
      mobile: mobile.trim(),
      role: 'agent',
      createdBy: req.user._id,
    });

    await agent.save();
    
    res.status(201).json(agent.toJSON());
  } catch (error) {
    console.error('Create agent error:', error);
    res.status(500).json({ 
      message: 'Server error',
      errors: ['Failed to create agent. Please try again.']
    });
  }
});

// Update agent (admin only)
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const { name, email, countryCode, mobile, isActive } = req.body;
    
    const agent = await User.findById(req.params.id);
    if (!agent || agent.role !== 'agent') {
      return res.status(404).json({ message: 'Agent not found' });
    }

    // Update fields
    if (name) agent.name = name;
    if (email) agent.email = email;
    if (countryCode) agent.countryCode = countryCode;
    if (mobile !== undefined) agent.mobile = mobile;
    if (isActive !== undefined) agent.isActive = isActive;

    await agent.save();
    
    res.json(agent.toJSON());
  } catch (error) {
    console.error('Update agent error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete agent (admin only)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const agent = await User.findById(req.params.id);
    if (!agent || agent.role !== 'agent') {
      return res.status(404).json({ message: 'Agent not found' });
    }

    await User.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Agent deleted successfully' });
  } catch (error) {
    console.error('Delete agent error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;