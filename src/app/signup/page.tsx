
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth, useFirestore, errorEmitter, FirestorePermissionError } from "@/firebase";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc, writeBatch } from "firebase/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

const formSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters").max(20),
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function SignupPage() {
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const { username, email, password } = values;

    const usernameRef = doc(firestore, 'usernames', username.toLowerCase());
    const usernameDoc = await getDoc(usernameRef);

    if (usernameDoc.exists()) {
      form.setError("username", { message: "This username is already taken." });
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const batch = writeBatch(firestore);
      const userProfileData = {
        id: user.uid,
        username,
        email,
        createdAt: new Date(),
      };
      const userRef = doc(firestore, 'users', user.uid);
      batch.set(userRef, userProfileData);

      const usernameData = { userId: user.uid };
      batch.set(usernameRef, usernameData);

      // Do not await the commit, chain a .catch for error handling
      batch.commit().catch(error => {
        // Create and emit a detailed error for both operations in the batch
        const userProfileError = new FirestorePermissionError({
          path: userRef.path,
          operation: 'create',
          requestResourceData: userProfileData,
        });
        errorEmitter.emit('permission-error', userProfileError);

        const usernameError = new FirestorePermissionError({
            path: usernameRef.path,
            operation: 'create',
            requestResourceData: usernameData,
        });
        errorEmitter.emit('permission-error', usernameError);

        // Also show a generic error to the user on the form
        form.setError("root", { message: "A permission error occurred during signup." });
      });

      router.push('/');
    } catch (error: any) {
      // This will now primarily catch auth errors, not Firestore ones
      if (error.code === 'auth/email-already-in-use') {
        form.setError("email", { message: "This email is already in use." });
      } else {
        form.setError("root", { message: error.message || "An unexpected error occurred during signup." });
      }
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign Up</CardTitle>
          <CardDescription>Create an account to start using SageSpark.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="yourusername" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="name@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {form.formState.errors.root && (
                <p className="text-sm font-medium text-destructive">{form.formState.errors.root.message}</p>
              )}
              <Button type="submit" className="w-full">Create Account</Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            Already have an account? <Link href="/login" className="text-primary hover:underline">Log in</Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
