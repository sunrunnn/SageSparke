'use client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState } from "react";

// This makes Puter.js available in the component
declare const puter: any;

export default function PuterPage() {
    const [prompt, setPrompt] = useState("");
    const [response, setResponse] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim()) return;

        setIsLoading(true);
        setResponse("");
        
        try {
            const aiResponse = await puter.ai.chat(prompt, { model: "gpt-4o" });
            setResponse(aiResponse);
        } catch (error: any) {
            console.error("Puter.js error:", error);
            setResponse(`Error: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="flex h-dvh flex-col items-center justify-center p-4">
            <Card className="w-full max-w-2xl">
                <CardHeader>
                    <CardTitle>Puter.js AI Demo</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <Input 
                            placeholder="Ask the AI a question..."
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                        />
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? "Thinking..." : "Submit"}
                        </Button>
                    </form>

                    {response && (
                        <div className="mt-6 p-4 border rounded-md bg-muted/50">
                            <h3 className="font-semibold mb-2">AI Response:</h3>
                            <p className="whitespace-pre-wrap">{response}</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </main>
    );
}
