import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { toast } from 'sonner@2.0.3';
import seiceLogo from '../assets/seice-logo.png';
import { supabase } from '../utils/supabase-client';

type ResetPasswordPageProps = {
  onDone: () => void;
};

export function ResetPasswordPage({ onDone }: ResetPasswordPageProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        toast.error('Erro ao redefinir senha: ' + error.message);
        return;
      }

      toast.success('Senha redefinida com sucesso!');
      onDone();
    } catch (error) {
      console.error('Reset password error:', error);
      toast.error('Erro interno ao redefinir senha');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-zinc-100/50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm lg:max-w-md">
        <div className="text-center mb-6 lg:mb-8">
          <div className="relative w-20 h-20 lg:w-24 lg:h-24 rounded-2xl bg-white flex items-center justify-center mx-auto mb-4 shadow-xl shadow-black/10 ring-1 ring-slate-200 overflow-hidden">
            <img src={seiceLogo} alt="Logo SEICE" className="w-full h-full object-contain p-1" />
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-800 mb-2 tracking-tight">
            Sistema SEICE
          </h1>
        </div>

        <Card className="seice-card border-t-2 border-t-seice-gold-light shadow-xl shadow-slate-900/5">
          <CardHeader className="text-center p-4 lg:p-6">
            <CardTitle className="text-lg lg:text-xl text-slate-800">Redefinir senha</CardTitle>
            <CardDescription className="text-sm lg:text-base text-slate-600">
              Escolha uma nova senha para sua conta
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 lg:p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nova senha</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-new-password">Confirmar nova senha</Label>
                <Input
                  id="confirm-new-password"
                  type="password"
                  placeholder="Confirme sua nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full bg-zinc-900 hover:bg-zinc-800" disabled={isLoading}>
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Salvando...</span>
                  </div>
                ) : (
                  'Salvar nova senha'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
