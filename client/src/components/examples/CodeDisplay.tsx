import CodeDisplay from '../CodeDisplay'

const sampleCode = `import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Login:', { email, password });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input 
        type="email" 
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input 
        type="password" 
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Button type="submit">Login</Button>
    </form>
  );
}`;

export default function CodeDisplayExample() {
  return (
    <div className="p-6">
      <CodeDisplay 
        code={sampleCode}
        language="tsx"
        filename="LoginForm.tsx"
      />
    </div>
  )
}
