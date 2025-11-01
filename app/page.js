'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Coins, Upload, FileText, Settings, LogOut, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function App() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Auth states
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '' });

  // Settings states
  const [settings, setSettings] = useState({ geminiApiKey: '', n8nWebhookUrl: '' });
  const [settingsLoading, setSettingsLoading] = useState(false);

  // Gabaritos states
  const [gabaritos, setGabaritos] = useState([]);
  const [newGabarito, setNewGabarito] = useState({ titulo: '', conteudo: '' });

  // Upload states
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedGabaritoId, setSelectedGabaritoId] = useState('');
  const [uploading, setUploading] = useState(false);

  // Avaliacoes states
  const [avaliacoes, setAvaliacoes] = useState([]);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem('token');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('token');
    }
    setLoading(false);
  };

  const loadData = async () => {
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    try {
      // Load credits
      const creditsRes = await fetch('/api/credits', { headers });
      if (creditsRes.ok) {
        const data = await creditsRes.json();
        setCredits(data.saldoAtual);
      }

      // Load gabaritos
      const gabaritosRes = await fetch('/api/gabaritos', { headers });
      if (gabaritosRes.ok) {
        const data = await gabaritosRes.json();
        setGabaritos(data.gabaritos);
      }

      // Load avaliacoes
      const avaliacoesRes = await fetch('/api/avaliacoes', { headers });
      if (avaliacoesRes.ok) {
        const data = await avaliacoesRes.json();
        setAvaliacoes(data.avaliacoes);
      }

      // Load settings
      const settingsRes = await fetch('/api/settings', { headers });
      if (settingsRes.ok) {
        const data = await settingsRes.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm)
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        setUser(data.user);
        setIsAuthenticated(true);
        toast.success(authMode === 'login' ? 'Login successful!' : 'Account created!');
      } else {
        toast.error(data.error || 'Authentication failed');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setUser(null);
    setCredits(0);
    toast.success('Logged out successfully');
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSettingsLoading(true);
    const token = localStorage.getItem('token');

    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        toast.success('Settings saved successfully!');
      } else {
        toast.error('Failed to save settings');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
    setSettingsLoading(false);
  };

  const handleCreateGabarito = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');

    try {
      const response = await fetch('/api/gabaritos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newGabarito)
      });

      if (response.ok) {
        toast.success('Gabarito created!');
        setNewGabarito({ titulo: '', conteudo: '' });
        loadData();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to create gabarito');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!selectedFile) {
      toast.error('Please select an image');
      return;
    }

    if (!selectedGabaritoId) {
      toast.error('Please select an answer key');
      return;
    }

    if (credits < 3) {
      toast.error('Insufficient credits. You need at least 3 credits.');
      return;
    }

    setUploading(true);
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('gabaritoId', selectedGabaritoId);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Upload successful! Correction in progress...');
        setSelectedFile(null);
        setSelectedGabaritoId('');
        loadData();
        setActiveTab('results');
      } else {
        toast.error(data.error || 'Upload failed');
      }
    } catch (error) {
      toast.error('An error occurred');
    }
    setUploading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-3xl font-bold">Corretor 80/20</CardTitle>
            <CardDescription>AI-Powered Grading Assistant</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={authMode} onValueChange={setAuthMode}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
              <TabsContent value="login">
                <form onSubmit={handleAuth} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={authForm.email}
                      onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={authForm.password}
                      onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full">Login</Button>
                </form>
              </TabsContent>
              <TabsContent value="register">
                <form onSubmit={handleAuth} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      placeholder="Your name"
                      value={authForm.name}
                      onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-email">Email</Label>
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="your@email.com"
                      value={authForm.email}
                      onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-password">Password</Label>
                    <Input
                      id="reg-password"
                      type="password"
                      value={authForm.password}
                      onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full">Create Account</Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Corretor 80/20</h1>
            <p className="text-sm text-gray-600">Welcome, {user?.name}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg">
              <Coins className="h-5 w-5 text-blue-600" />
              <span className="font-semibold text-blue-900">{credits} credits</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 max-w-2xl mx-auto">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="gabaritos">Answer Keys</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="mt-6">
            <div className="grid gap-6 max-w-2xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Upload Student Answer
                  </CardTitle>
                  <CardDescription>
                    Upload a photo of a student's answer to get it graded by AI (costs 3 credits)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUpload} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="gabarito-select">Select Answer Key</Label>
                      <Select value={selectedGabaritoId} onValueChange={setSelectedGabaritoId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose an answer key" />
                        </SelectTrigger>
                        <SelectContent>
                          {gabaritos.map((gab) => (
                            <SelectItem key={gab.id} value={gab.id}>
                              {gab.titulo}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {gabaritos.length === 0 && (
                        <p className="text-sm text-amber-600">No answer keys available. Create one first!</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="file-upload">Student Answer Image</Label>
                      <Input
                        id="file-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        disabled={uploading}
                      />
                      {selectedFile && (
                        <p className="text-sm text-green-600">Selected: {selectedFile.name}</p>
                      )}
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={uploading || !selectedFile || !selectedGabaritoId || credits < 3}
                    >
                      {uploading ? 'Uploading...' : 'Upload & Grade (3 credits)'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Gabaritos Tab */}
          <TabsContent value="gabaritos" className="mt-6">
            <div className="grid gap-6 max-w-4xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Create New Answer Key
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreateGabarito} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="gabarito-titulo">Title</Label>
                      <Input
                        id="gabarito-titulo"
                        placeholder="e.g., Math Quiz - Chapter 5"
                        value={newGabarito.titulo}
                        onChange={(e) => setNewGabarito({ ...newGabarito, titulo: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gabarito-conteudo">Answer Key Content</Label>
                      <Textarea
                        id="gabarito-conteudo"
                        placeholder="Enter the correct answers or grading criteria..."
                        value={newGabarito.conteudo}
                        onChange={(e) => setNewGabarito({ ...newGabarito, conteudo: e.target.value })}
                        rows={6}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full">Create Answer Key</Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Your Answer Keys</CardTitle>
                  <CardDescription>{gabaritos.length} answer key(s) created</CardDescription>
                </CardHeader>
                <CardContent>
                  {gabaritos.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">No answer keys yet. Create your first one above!</p>
                  ) : (
                    <div className="space-y-3">
                      {gabaritos.map((gab) => (
                        <div key={gab.id} className="p-4 border rounded-lg">
                          <h3 className="font-semibold text-lg">{gab.titulo}</h3>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{gab.conteudo}</p>
                          <p className="text-xs text-gray-400 mt-2">
                            Created: {new Date(gab.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Results Tab */}
          <TabsContent value="results" className="mt-6">
            <Card className="max-w-4xl mx-auto">
              <CardHeader>
                <CardTitle>Grading Results</CardTitle>
                <CardDescription>{avaliacoes.length} assessment(s) processed</CardDescription>
              </CardHeader>
              <CardContent>
                {avaliacoes.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No assessments yet. Upload a student answer to get started!</p>
                ) : (
                  <div className="space-y-4">
                    {avaliacoes.map((av) => (
                      <div key={av.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {av.status === 'completed' ? (
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                              ) : av.status === 'pending' ? (
                                <Clock className="h-5 w-5 text-yellow-600" />
                              ) : (
                                <XCircle className="h-5 w-5 text-red-600" />
                              )}
                              <h3 className="font-semibold">{av.gabaritoTitulo}</h3>
                            </div>
                            {av.status === 'completed' && (
                              <>
                                <div className="mb-2">
                                  <span className="text-2xl font-bold text-blue-600">{av.nota}/10</span>
                                </div>
                                <p className="text-sm text-gray-700 mb-2"><strong>Feedback:</strong> {av.feedback}</p>
                                {av.textoOcr && (
                                  <details className="text-sm">
                                    <summary className="cursor-pointer text-gray-600 hover:text-gray-800">View OCR Text</summary>
                                    <p className="mt-2 p-2 bg-gray-50 rounded text-gray-700">{av.textoOcr}</p>
                                  </details>
                                )}
                              </>
                            )}
                            {av.status === 'pending' && (
                              <p className="text-sm text-yellow-600">Processing... This may take a minute.</p>
                            )}
                          </div>
                          <div className="text-right text-xs text-gray-400 ml-4">
                            {new Date(av.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-6">
            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configuration
                </CardTitle>
                <CardDescription>
                  Configure your API keys and webhook URLs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveSettings} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="gemini-key">Gemini API Key</Label>
                    <Input
                      id="gemini-key"
                      type="password"
                      placeholder="Enter your Gemini API key"
                      value={settings.geminiApiKey}
                      onChange={(e) => setSettings({ ...settings, geminiApiKey: e.target.value })}
                    />
                    <p className="text-xs text-gray-500">
                      Get your key from: <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google AI Studio</a>
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="n8n-webhook">N8N Webhook URL</Label>
                    <Input
                      id="n8n-webhook"
                      type="url"
                      placeholder="https://your-n8n-instance.com/webhook/..."
                      value={settings.n8nWebhookUrl}
                      onChange={(e) => setSettings({ ...settings, n8nWebhookUrl: e.target.value })}
                    />
                    <p className="text-xs text-gray-500">
                      Your N8N workflow webhook URL that will process the grading
                    </p>
                  </div>
                  <Button type="submit" className="w-full" disabled={settingsLoading}>
                    {settingsLoading ? 'Saving...' : 'Save Settings'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
