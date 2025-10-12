import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { User } from '../App';
import { supabase } from '../utils/supabase-client';

type LoginPageProps = {
  onLogin: (user: User) => void;
};

export function LoginPage({ onLogin }: LoginPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginForm.email,
        password: loginForm.password,
      });

      if (error) {
        toast.error('Erro no login: ' + error.message);
        return;
      }

      if (data.user && data.session) {
        // Store access token for API calls
        localStorage.setItem('access_token', data.session.access_token);
        toast.success('Login realizado com sucesso!');
        onLogin(data.user as User);
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Erro interno no login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (signupForm.password !== signupForm.confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (signupForm.password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-83358821/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({
          name: signupForm.name,
          email: signupForm.email,
          password: signupForm.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error('Erro no cadastro: ' + data.error);
        return;
      }

      toast.success('Cadastro realizado com sucesso! Faça login para continuar.');
      
      // Save credentials for auto-login
      const savedEmail = signupForm.email;
      const savedPassword = signupForm.password;
      
      // Clear form and switch to login tab
      setSignupForm({ name: '', email: '', password: '', confirmPassword: '' });
      
      // Auto-login after signup
      setTimeout(async () => {
        const { data: loginData, error } = await supabase.auth.signInWithPassword({
          email: savedEmail,
          password: savedPassword,
        });

        if (!error && loginData.user && loginData.session) {
          // Store access token for API calls
          localStorage.setItem('access_token', loginData.session.access_token);
          onLogin(loginData.user as User);
        }
      }, 1000);

    } catch (error) {
      console.error('Signup error:', error);
      toast.error('Erro interno no cadastro');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm lg:max-w-md">
        <div className="text-center mb-6 lg:mb-8">
          <div className="seice-gradient w-16 h-16 lg:w-20 lg:h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-white font-bold text-2xl lg:text-3xl">S</span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 mb-2">
            Sistema SEICE
          </h1>
          <p className="text-sm lg:text-base text-slate-600">
            Plataforma de Avaliação Educacional Integrada
          </p>
        </div>

        <Card className="seice-card">
          <CardHeader className="text-center p-4 lg:p-6">
            <CardTitle className="text-lg lg:text-xl text-slate-800">Acesso ao Sistema</CardTitle>
            <CardDescription className="text-sm lg:text-base text-slate-600">
              Entre com suas credenciais ou crie uma nova conta
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 lg:p-6">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Cadastro</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Senha</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="Sua senha"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      required
                    />
                  </div>
                  
                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
                    {isLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        <span>Entrando...</span>
                      </div>
                    ) : (
                      'Entrar no Sistema'
                    )}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nome completo</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Seu nome completo"
                      value={signupForm.name}
                      onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={signupForm.email}
                      onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={signupForm.password}
                      onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm">Confirmar senha</Label>
                    <Input
                      id="signup-confirm"
                      type="password"
                      placeholder="Confirme sua senha"
                      value={signupForm.confirmPassword}
                      onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                      required
                    />
                  </div>
                  
                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
                    {isLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        <span>Criando conta...</span>
                      </div>
                    ) : (
                      'Criar Conta'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        <div className="text-center mt-4 lg:mt-6 text-xs lg:text-sm text-slate-500">
          <div className="flex items-center justify-center space-x-2 mb-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Sistema Online</span>
          </div>
          <p className="text-xs lg:text-sm">Plataforma completa para avaliações educacionais</p>
          <p className="text-xs mt-1">© 2024 Sistema SEICE - Versão 2.1.0</p>
        </div>
      </div>
    </div>
  );
}