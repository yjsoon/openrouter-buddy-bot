import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const ask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setLoading(true);
    setAnswer(null);
    try {
      const { data, error } = await supabase.functions.invoke("openrouter-chat", {
        body: {
          messages: [{ role: "user", content: prompt }],
          model: "openai/gpt-4o-mini",
        },
      });

      if (error) throw error as any;

      const content = (data as any)?.content ?? (data as any)?.raw?.choices?.[0]?.message?.content;
      setAnswer(typeof content === "string" ? content : JSON.stringify(content));
      toast({ title: "Response received" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to get response";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="w-full border-b">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">AI Chatbot Assistant</h1>
          <p className="text-muted-foreground mt-2">Ask a question and get an answer securely via Supabase Edge Functions.</p>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <section aria-labelledby="chat-section">
          <Card>
            <CardHeader>
              <CardTitle id="chat-section">Chat</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={ask} className="space-y-4">
                <label htmlFor="prompt" className="sr-only">Your message</label>
                <Textarea
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Type your question here..."
                  className="min-h-[120px]"
                />
                <div className="flex items-center gap-2">
                  <Button type="submit" disabled={loading}>
                    {loading ? "Thinking…" : "Ask"}
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => { setPrompt(""); setAnswer(null); }}>
                    Clear
                  </Button>
                </div>
              </form>
              {answer && (
                <div className="rounded-md border p-4 bg-card text-card-foreground">
                  <h2 className="font-semibold mb-2">Assistant</h2>
                  <p className="whitespace-pre-wrap leading-relaxed">{answer}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
};

export default Index;

