"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { tasksApi } from "@/lib/api";
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  LogOut, 
  Calendar,
  User,
  Mail,
  RefreshCw,
  BarChart3,
  Search,
  Filter
} from "lucide-react";
import { toast } from "sonner";

interface Task {
  _id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate?: string;
  assignedBy: { name: string; email: string };
  createdAt: string;
}

export default function AgentDashboard() {
  const { user, logout } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    try {
      // Use the contacts endpoint to get tasks with contact details
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/tasks/contacts`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }
      
      const tasksData = await response.json();
      setTasks(tasksData);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, status: string) => {
    try {
      await tasksApi.update(taskId, { status });
      toast.success('Task status updated successfully!');
      loadTasks();
      setSelectedTask(null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update task');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'in-progress': return 'text-blue-600 bg-blue-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-blue-600 bg-blue-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'in-progress': return <RefreshCw className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const tasksByStatus = {
    pending: tasks.filter(t => t.status === 'pending'),
    'in-progress': tasks.filter(t => t.status === 'in-progress'),
    completed: tasks.filter(t => t.status === 'completed'),
  };

  const filteredTasks = tasks.filter(task =>
    task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="nav-blur border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-sf-pro font-semibold text-gray-900">Dashboard</span>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={loadTasks}
                className="apple-button-secondary flex items-center gap-2 px-4 py-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600">Welcome, {user?.name}</span>
                <button
                  onClick={logout}
                  className="apple-button-secondary flex items-center gap-2 px-4 py-2"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Profile Section */}
        <div className="apple-card p-6 mb-8">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
              <User className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-display text-2xl font-bold text-gray-900">{user?.name}</h1>
              <div className="flex items-center gap-4 text-gray-600 mt-1">
                <div className="flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                  {user?.email}
                </div>
                <div className="flex items-center gap-1">
                  <div className="status-dot blue"></div>
                  Team Member
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-gray-900">{tasks.length}</div>
              <div className="text-gray-600">Total Tasks</div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="apple-card p-6 text-center">
            <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{tasksByStatus.pending.length}</div>
            <div className="text-gray-600">Pending Tasks</div>
          </div>
          
          <div className="apple-card p-6 text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <RefreshCw className="h-6 w-6 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{tasksByStatus['in-progress'].length}</div>
            <div className="text-gray-600">In Progress</div>
          </div>
          
          <div className="apple-card p-6 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{tasksByStatus.completed.length}</div>
            <div className="text-gray-600">Completed</div>
          </div>
        </div>

        {/* Tasks Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-display text-2xl font-bold text-gray-900">My Tasks</h2>
              <p className="text-body text-gray-600">Manage and track your assigned tasks</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="apple-input pl-10 w-64"
                />
              </div>
            </div>
          </div>
          
          {loading ? (
            <div className="apple-card p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto mb-4"></div>
              <p className="text-gray-600">Loading tasks...</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="apple-card p-12 text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-display text-xl font-semibold text-gray-900 mb-2">
                {searchTerm ? 'No matching tasks' : 'No tasks assigned'}
              </h3>
              <p className="text-gray-600">
                {searchTerm ? 'Try adjusting your search terms' : 'You don\'t have any tasks assigned yet.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredTasks.map((task) => (
                <div 
                  key={task._id} 
                  className="apple-card p-6 cursor-pointer hover:shadow-lg transition-all duration-200"
                  onClick={() => setSelectedTask(task)}
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 mr-2">
                        <h3 className="font-semibold text-gray-900 line-clamp-2">{task.title}</h3>
                        {task.contactDetails?.firstName && (
                          <div className="text-sm text-blue-600 mt-1">
                            Contact: {task.contactDetails.firstName}
                          </div>
                        )}
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                        {task.priority.toUpperCase()}
                      </div>
                    </div>
                    
                    {task.contactDetails?.phone && (
                      <div className="text-gray-700 text-sm">
                        <span className="font-medium">Phone:</span> {task.contactDetails.phone}
                      </div>
                    )}
                    
                    {task.contactDetails?.notes && (
                      <div className="text-gray-600 text-sm">
                        <span className="font-medium">Notes:</span> {task.contactDetails.notes}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <div className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(task.status)}`}>
                        {getStatusIcon(task.status)}
                        {task.status.replace('-', ' ').toUpperCase()}
                      </div>
                      
                      {task.dueDate && (
                        <div className="text-gray-500 text-xs flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(task.dueDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    
                    <div className="pt-3 border-t border-gray-200">
                      <p className="text-gray-500 text-xs">
                        Assigned by: {task.assignedBy.name}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Task Detail Modal */}
        {selectedTask && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="apple-card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8">
              <div className="space-y-6">
                <div className="flex items-start justify-between">
                  <h2 className="text-display text-2xl font-bold text-gray-900 flex-1 mr-4">{selectedTask.title}</h2>
                  <button
                    onClick={() => setSelectedTask(null)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ✕
                  </button>
                </div>
                
                {/* Contact Information */}
                {selectedTask.contactDetails && (
                  <div className="bg-blue-50 p-4 rounded-xl">
                    <h3 className="font-semibold text-blue-900 mb-3">Contact Information</h3>
                    <div className="space-y-2">
                      {selectedTask.contactDetails.firstName && (
                        <div>
                          <span className="text-blue-700 font-medium">Name:</span>
                          <span className="text-blue-900 ml-2">{selectedTask.contactDetails.firstName}</span>
                        </div>
                      )}
                      {selectedTask.contactDetails.phone && (
                        <div>
                          <span className="text-blue-700 font-medium">Phone:</span>
                          <span className="text-blue-900 ml-2">{selectedTask.contactDetails.phone}</span>
                        </div>
                      )}
                      {selectedTask.contactDetails.notes && (
                        <div>
                          <span className="text-blue-700 font-medium">Notes:</span>
                          <span className="text-blue-900 ml-2">{selectedTask.contactDetails.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <p className="text-body text-gray-700 leading-relaxed">{selectedTask.description}</p>
                
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-gray-600 text-sm font-medium block mb-2">Status</label>
                    <div className={`px-4 py-2 rounded-xl flex items-center gap-2 ${getStatusColor(selectedTask.status)}`}>
                      {getStatusIcon(selectedTask.status)}
                      <span className="font-medium">{selectedTask.status.replace('-', ' ').toUpperCase()}</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-gray-600 text-sm font-medium block mb-2">Priority</label>
                    <div className={`px-4 py-2 rounded-xl font-medium ${getPriorityColor(selectedTask.priority)}`}>
                      {selectedTask.priority.toUpperCase()}
                    </div>
                  </div>
                </div>
                
                {selectedTask.dueDate && (
                  <div>
                    <label className="text-gray-600 text-sm font-medium block mb-2">Due Date</label>
                    <div className="text-gray-900 font-medium">
                      {new Date(selectedTask.dueDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                )}
                
                <div>
                  <label className="text-gray-600 text-sm font-medium block mb-2">Assigned By</label>
                  <div className="text-gray-900 font-medium">{selectedTask.assignedBy.name}</div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-3 pt-6 border-t border-gray-200">
                  {selectedTask.status === 'pending' && (
                    <button
                      onClick={() => handleUpdateTaskStatus(selectedTask._id, 'in-progress')}
                      className="apple-button"
                    >
                      Start Task
                    </button>
                  )}
                  
                  {selectedTask.status === 'in-progress' && (
                    <button
                      onClick={() => handleUpdateTaskStatus(selectedTask._id, 'completed')}
                      className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
                    >
                      Mark Complete
                    </button>
                  )}
                  
                  <button
                    onClick={() => setSelectedTask(null)}
                    className="apple-button-secondary"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
