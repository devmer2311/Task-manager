import express from 'express';
import Task from '../models/Task.js';
import User from '../models/User.js';
import { auth, adminAuth } from '../middleware/auth.js';

const router = express.Router();

// Get tasks (role-based access)
router.get('/', auth, async (req, res) => {
  try {
    let query = {};
    
    if (req.user.role === 'agent') {
      // Agents can only see their own tasks
      query.agentId = req.user._id;
    }

    const tasks = await Task.find(query)
      .populate('agentId', 'name email')
      .populate('assignedBy', 'name email')
      .sort({ createdAt: -1 });
    
    res.json(tasks);
  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create task (admin only)
router.post('/', adminAuth, async (req, res) => {
  try {
    const { title, description, agentId, priority, dueDate, metadata } = req.body;

    // Validation
    if (!title || !agentId) {
      return res.status(400).json({ message: 'Title and agent are required' });
    }

    // Verify agent exists
    const agent = await User.findById(agentId);
    if (!agent || agent.role !== 'agent' || !agent.isActive) {
      return res.status(400).json({ message: 'Invalid or inactive agent' });
    }

    const task = new Task({
      title,
      description,
      agentId,
      priority: priority || 'medium',
      dueDate: dueDate ? new Date(dueDate) : undefined,
      assignedBy: req.user._id,
      metadata: metadata || {},
    });

    await task.save();
    await task.populate('agentId', 'name email');
    await task.populate('assignedBy', 'name email');
    
    res.status(201).json(task);
  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update task status (agents can update their own tasks)
router.put('/:id', auth, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check permissions
    if (req.user.role === 'agent' && task.agentId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { status, description, metadata } = req.body;

    if (status) {
      task.status = status;
      if (status === 'completed') {
        task.completedAt = new Date();
      }
    }
    
    if (description !== undefined) task.description = description;
    if (metadata) task.metadata = { ...task.metadata, ...metadata };

    await task.save();
    await task.populate('agentId', 'name email');
    await task.populate('assignedBy', 'name email');
    
    res.json(task);
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get task statistics (admin only)
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const stats = await Task.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const agentStats = await Task.aggregate([
      {
        $group: {
          _id: '$agentId',
          totalTasks: { $sum: 1 },
          completedTasks: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'agent'
        }
      },
      {
        $unwind: '$agent'
      },
      {
        $project: {
          agentName: '$agent.name',
          agentEmail: '$agent.email',
          totalTasks: 1,
          completedTasks: 1,
          completionRate: {
            $multiply: [
              { $divide: ['$completedTasks', '$totalTasks'] },
              100
            ]
          }
        }
      }
    ]);

    res.json({
      taskStats: stats,
      agentStats
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;