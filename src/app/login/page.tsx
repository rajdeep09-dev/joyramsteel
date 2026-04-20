'use client';

import { useActionState, useEffect } from 'react';
import { login } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, null);

  useEffect(() => {
    if (state?.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-4 relative z-10">
      <div className="absolute inset-0 -z-10 h-full w-full bg-transparent bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none">
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-indigo-500 opacity-10 blur-[100px] pointer-events-none"></div>
      </div>
      
      <Card className="w-full max-w-md border-zinc-200/60 bg-white/80 backdrop-blur-xl shadow-xl shadow-zinc-200/50">
        <CardHeader className="space-y-2 text-center pb-6">
          <div className="mx-auto w-20 h-20 rounded-full overflow-hidden mb-2 shadow-2xl border-2 border-zinc-100 shadow-zinc-900/20">
            <img src="/joyramlogo.png" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-zinc-900">
            Joy Ram Steel
          </CardTitle>
          <CardDescription className="text-zinc-500 font-medium">
            Sign in to access your dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-700 font-medium">Email Address</Label>
              <Input 
                id="email" 
                name="email" 
                type="email" 
                placeholder="admin@joyramsteel.com" 
                required 
                className="border-zinc-200 bg-white/50 text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-zinc-900 h-11"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-zinc-700 font-medium">Password</Label>
              </div>
              <Input 
                id="password" 
                name="password" 
                type="password" 
                required 
                className="border-zinc-200 bg-white/50 text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-zinc-900 h-11"
                placeholder="••••••••"
              />
            </div>
            <Button type="submit" className="w-full bg-zinc-900 text-white hover:bg-zinc-800 h-11 shadow-md shadow-zinc-900/20" disabled={pending}>
              {pending ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white"></div>
                  <span>Authenticating...</span>
                </div>
              ) : 'Sign In'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t border-zinc-100 mt-2 pt-6 pb-2">
          <p className="text-sm text-zinc-500 flex items-center gap-1">
            Engineered by <span className="font-semibold text-zinc-900 hover:text-indigo-600 transition-colors">@rajdeep.0.21</span>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
