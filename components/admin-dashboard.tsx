"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { agentsApi, tasksApi, uploadApi } from "@/lib/api";
import { 
  Users, 
  Upload, 
  BarChart3, 
  Plus, 
  Trash2, 
  LogOut,
  CheckCircle,
  Clock,
  AlertCircle,
  Settings,
  Search,
  Filter
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Agent {
  _id: string;
  name: string;
  email: string;
  countryCode: string;
  mobile: string;
  isActive: boolean;
  createdAt: string;
}

interface Task {
  _id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  agentId: { name: string; email: string };
  createdAt: string;
}

interface Stats {
  taskStats: Array<{ _id: string; count: number }>;
  agentStats: Array<{
    agentName: string;
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
  }>;
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'team' | 'upload'>('overview');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAgentForm, setShowAgentForm] = useState(false);
  const [showListsView, setShowListsView] = useState(false);
  const [distributedLists, setDistributedLists] = useState<any[]>([]);
  
  // Form states
  const [agentForm, setAgentForm] = useState({
    name: '',
    email: '',
    password: '',
    countryCode: '+1',
    mobile: ''
  });
  
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [agentsData, tasksData, statsData, listsData] = await Promise.all([
        agentsApi.getAll(),
        tasksApi.getAll(),
        tasksApi.getStats(),
        uploadApi.getLists().catch(() => [])
      ]);
      
      setAgents(agentsData);
      setTasks(tasksData);
      setStats(statsData);
      setDistributedLists(listsData);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFormErrors([]);
    
    try {
      await agentsApi.create(agentForm);
      toast.success('Team member added successfully!');
      setAgentForm({ name: '', email: '', password: '', countryCode: '+1', mobile: '' });
      setShowAgentForm(false);
      loadData();
    } catch (error: any) {
      if (error.message.includes('Validation failed') && error.errors) {
        setFormErrors(error.errors);
      } else {
        toast.error(error.message || 'Failed to add team member');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAgent = async (id: string) => {
    if (!confirm('Are you sure you want to remove this team member?')) return;
    
    try {
      await agentsApi.delete(id);
      toast.success('Team member removed successfully');
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove team member');
    }
  };

  const handleFileUpload = async () => {
    if (!uploadFile) return;
    
    setLoading(true);
    try {
      const result = await uploadApi.uploadFile(uploadFile);
      
      if (result.success) {
        toast.success(result.message);
        setUploadFile(null);
        loadData();
      } else {
        toast.error(result.message || 'Upload failed');
        if (result.errors && result.errors.length > 0) {
          result.errors.forEach((error: string) => toast.error(error));
        }
      }
    } catch (error: any) {
      const errorData = error.response?.data;
      if (errorData && errorData.errors) {
        toast.error(errorData.message || 'Upload failed');
        errorData.errors.forEach((err: string) => toast.error(err));
      } else {
        toast.error(error.message || 'Upload failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const file = files[0];
    
    if (file && (file.type === 'text/csv' || file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      setUploadFile(file);
    } else {
      toast.error('Invalid file type! Only CSV and Excel files are allowed');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'in-progress': return 'text-blue-600';
      case 'pending': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'in-progress': return <Clock className="h-4 w-4" />;
      case 'pending': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="nav-blur border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-sf-pro font-semibold text-gray-900">Dashboard</span>
              </div>
              
              <div className="hidden md:flex items-center gap-1">
                {[
                  { key: 'overview', label: 'Overview', icon: BarChart3 },
                  { key: 'team', label: 'Team', icon: Users },
                  { key: 'upload', label: 'Upload', icon: Upload },
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key as any)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                      activeTab === key
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
            
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
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div>
              <h1 className="text-display text-3xl font-bold text-gray-900 mb-2">Overview</h1>
              <p className="text-body text-gray-600">Monitor your team's performance and task progress</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="apple-card p-6 text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900">{agents.length}</div>
                <div className="text-gray-600">Team Members</div>
              </div>
              
              <div className="apple-card p-6 text-center">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="h-6 w-6 text-green-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900">{tasks.length}</div>
                <div className="text-gray-600">Total Tasks</div>
              </div>
              
              <div className="apple-card p-6 text-center">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {tasks.filter(t => t.status === 'completed').length}
                </div>
                <div className="text-gray-600">Completed</div>
              </div>
              
              <div className="apple-card p-6 text-center">
                <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {tasks.filter(t => t.status === 'pending').length}
                </div>
                <div className="text-gray-600">Pending</div>
              </div>
            </div>

            {/* Recent Tasks */}
            <div className="apple-card p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-display text-xl font-semibold text-gray-900">Recent Tasks</h3>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search tasks..."
                      className="apple-input pl-10 w-64"
                    />
                  </div>
                  <button className="apple-button-secondary p-2">
                    <Filter className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {tasks.slice(0, 10).map((task) => (
                  <div key={task._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{task.title}</div>
                      <div className="text-sm text-gray-600">
                        Assigned to: {task.agentId.name}
                      </div>
                    </div>
                    <div className={`flex items-center gap-2 ${getStatusColor(task.status)}`}>
                      {getStatusIcon(task.status)}
                      <span className="capitalize text-sm font-medium">{task.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Team Tab */}
        {activeTab === 'team' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-display text-3xl font-bold text-gray-900 mb-2">Team Management</h1>
                <p className="text-body text-gray-600">Manage your team members and their access</p>
              </div>
              <button
                onClick={() => setShowAgentForm(true)}
                className="apple-button flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Member
              </button>
            </div>

            {/* Agent Form Modal */}
            {showAgentForm && (
              <div className="apple-card p-8">
                <h3 className="text-display text-xl font-semibold text-gray-900 mb-6">Add Team Member</h3>
                
                {formErrors.length > 0 && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                    <h4 className="text-red-800 font-medium mb-2">Please fix the following errors:</h4>
                    <ul className="text-red-600 text-sm space-y-1">
                      {formErrors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <form onSubmit={handleCreateAgent} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="name" className="text-gray-700 font-medium mb-2 block">Full Name</Label>
                      <input
                        id="name"
                        value={agentForm.name}
                        onChange={(e) => setAgentForm(prev => ({ ...prev, name: e.target.value }))}
                        className="apple-input w-full"
                        placeholder="Enter full name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email" className="text-gray-700 font-medium mb-2 block">Email Address</Label>
                      <input
                        id="email"
                        type="email"
                        value={agentForm.email}
                        onChange={(e) => setAgentForm(prev => ({ ...prev, email: e.target.value }))}
                        className="apple-input w-full"
                        placeholder="Enter email address"
                      />
                    </div>
                    <div>
                      <Label htmlFor="password" className="text-gray-700 font-medium mb-2 block">Password</Label>
                      <input
                        id="password"
                        type="password"
                        value={agentForm.password}
                        onChange={(e) => setAgentForm(prev => ({ ...prev, password: e.target.value }))}
                        className="apple-input w-full"
                        placeholder="Enter password"
                      />
                    </div>
                    <div>
                      <Label htmlFor="mobile" className="text-gray-700 font-medium mb-2 block">Mobile Number</Label>
                      <div className="flex gap-2">
                        <Select
                          value={agentForm.countryCode}
                          onValueChange={(value) => setAgentForm(prev => ({ ...prev, countryCode: value }))}
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="+1">+1</SelectItem>
                            <SelectItem value="+44">+44</SelectItem>
                            <SelectItem value="+91">+91</SelectItem>
                          </SelectContent>
                        </Select>
                        <input
                          id="mobile"
                          value={agentForm.mobile}
                          onChange={(e) => setAgentForm(prev => ({ ...prev, mobile: e.target.value }))}
                          className="apple-input flex-1"
                          placeholder="Enter mobile number"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="apple-button disabled:opacity-50"
                    >
                      {loading ? 'Adding...' : 'Add Member'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAgentForm(false);
                        setFormErrors([]);
                      }}
                      className="apple-button-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Team Members List */}
            <div className="apple-card p-6">
              <h3 className="text-display text-xl font-semibold text-gray-900 mb-6">Team Members</h3>
              <div className="space-y-4">
                {agents.map((agent) => (
                  <div key={agent._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-white font-medium text-sm">
                          {agent.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{agent.name}</div>
                        <div className="text-sm text-gray-600">{agent.email}</div>
                        <div className="text-sm text-gray-500">
                          {agent.countryCode} {agent.mobile}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                        agent.isActive 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        <div className={`status-dot ${agent.isActive ? 'green' : 'red'}`}></div>
                        {agent.isActive ? 'Active' : 'Inactive'}
                      </div>
                      <button
                        onClick={() => handleDeleteAgent(agent._id)}
                        className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Upload Tab */}
        {activeTab === 'upload' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-display text-3xl font-bold text-gray-900 mb-2">List Distribution</h1>
                <p className="text-body text-gray-600">Upload CSV files to distribute lists among agents</p>
              </div>
              <button
                onClick={() => setShowListsView(!showListsView)}
                className="apple-button-secondary"
              >
                {showListsView ? 'Upload New File' : 'View Distributed Lists'}
              </button>
            </div>
            
            {!showListsView ? (
              <>
                <div className="apple-card p-8">
                  <div className="text-center">
                    <div
                      className={`border-2 border-dashed rounded-2xl p-12 transition-all duration-300 ${
                        isDragging
                          ? 'border-blue-400 bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Upload className="h-8 w-8 text-blue-600" />
                      </div>
                      <h3 className="text-display text-xl font-semibold text-gray-900 mb-2">
                        Upload List File
                      </h3>
                      <p className="text-body text-gray-600 mb-6">
                        Upload a CSV file with FirstName, Phone, and Notes columns
                      </p>
                      
                      <input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                        className="hidden"
                        id="file-upload"
                      />
                      
                      <label
                        htmlFor="file-upload"
                        className="apple-button-secondary cursor-pointer"
                      >
                        Browse Files
                      </label>
                      
                      {uploadFile && (
                        <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-900 font-medium">{uploadFile.name}</span>
                            <button
                              onClick={() => setUploadFile(null)}
                              className="text-gray-500 hover:text-gray-700"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {uploadFile && (
                      <div className="mt-8">
                        <button
                          onClick={handleFileUpload}
                          disabled={loading}
                          className="apple-button disabled:opacity-50"
                        >
                          {loading ? 'Processing...' : 'Upload and Process'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Upload Instructions */}
                <div className="apple-card p-6">
                  <h3 className="text-display text-lg font-semibold text-gray-900 mb-4">File Format Requirements</h3>
                  <div className="space-y-3 text-gray-600">
                    <p>• CSV file must contain exactly these columns: <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">FirstName, Phone, Notes</code></p>
                    <p>• <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">FirstName</code> and <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">Phone</code> are required fields</p>
                    <p>• <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">Notes</code> field is optional</p>
                    <p>• Phone numbers should contain only numbers, spaces, dashes, parentheses, or plus signs</p>
                    <p>• Lists will be distributed equally among all active agents</p>
                    <p>• If items cannot be divided equally, remaining items are distributed sequentially</p>
                  </div>
                </div>
              </>
            ) : (
              /* Distributed Lists View */
              <div className="apple-card p-6">
                <h3 className="text-display text-xl font-semibold text-gray-900 mb-6">Distributed Lists</h3>
                {distributedLists.length === 0 ? (
                  <div className="text-center py-12">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No lists have been uploaded yet</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {distributedLists.map((list) => (
                      <div key={list._id} className="bg-gray-50 rounded-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="font-semibold text-gray-900">{list.agentId?.name || 'Unknown Agent'}</h4>
                            <p className="text-gray-600 text-sm">{list.agentId?.email}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-gray-900">{list.totalItems}</div>
                            <div className="text-gray-600 text-sm">Items</div>
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">
                          File: {list.fileName} • Uploaded: {new Date(list.uploadedAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}