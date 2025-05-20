"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("react");
const react_hook_form_1 = require("react-hook-form");
const zod_1 = require("@hookform/resolvers/zod");
const zod_2 = require("zod");
const button_1 = require("@/components/ui/button");
const card_1 = require("@/components/ui/card");
const form_1 = require("@/components/ui/form");
const textarea_1 = require("@/components/ui/textarea");
const select_1 = require("@/components/ui/select");
const generate_writing_prompts_1 = require("@/ai/flows/generate-writing-prompts");
const use_toast_1 = require("@/hooks/use-toast");
const scroll_area_1 = require("@/components/ui/scroll-area");
const lucide_react_1 = require("lucide-react");
const formSchema = zod_2.z.object({
    templateTitle: zod_2.z.string().min(1, { message: 'Please select a template.' }),
    userInput: zod_2.z.string().min(10, { message: 'Please provide some input (at least 10 characters).' }).max(500, { message: 'Input must be 500 characters or less.' }),
});
const storyTemplates = [
    { id: 'hero_journey', title: "Hero's Journey" },
    { id: 'mystery_novel', title: 'Mystery Novel' },
    { id: 'sci_fi_adventure', title: 'Sci-Fi Adventure' },
    { id: 'fantasy_quest', title: 'Fantasy Quest' },
    { id: 'romance_story', title: 'Romance Story' },
];
const AiWritingPrompts = () => {
    const [prompts, setPrompts] = (0, react_1.useState)([]);
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const { toast } = (0, use_toast_1.useToast)();
    const form = (0, react_hook_form_1.useForm)({
        resolver: (0, zod_1.zodResolver)(formSchema),
        defaultValues: {
            templateTitle: '',
            userInput: '',
        },
    });
    const onSubmit = async (data) => {
        setIsLoading(true);
        setPrompts([]);
        try {
            const input = {
                templateTitle: data.templateTitle,
                userInput: data.userInput,
            };
            const result = await (0, generate_writing_prompts_1.generateWritingPrompts)(input);
            if (result && result.writingPrompts) {
                setPrompts(result.writingPrompts);
                toast({
                    title: 'Prompts Generated!',
                    description: 'Your creative writing prompts are ready.',
                });
            }
            else {
                throw new Error('No prompts returned from AI.');
            }
        }
        catch (error) {
            console.error('Error generating prompts:', error);
            toast({
                variant: 'destructive',
                title: 'Error Generating Prompts',
                description: error.message || 'An unexpected error occurred. Please try again.',
            });
        }
        finally {
            setIsLoading(false);
        }
    };
    return (<section aria-labelledby="ai-prompts-title" className="py-8 md:py-12">
      <div className="container mx-auto px-4">
        <card_1.Card className="w-full max-w-2xl mx-auto shadow-xl">
          <card_1.CardHeader>
            <div className="flex items-center space-x-3 mb-2">
              <lucide_react_1.Feather className="h-8 w-8 text-accent"/>
              <card_1.CardTitle id="ai-prompts-title" className="text-2xl md:text-3xl font-titles">Ignite Your Creativity</card_1.CardTitle>
            </div>
            <card_1.CardDescription>
              Select a story template and provide some initial ideas. Our AI will conjure up unique writing prompts to inspire your next masterpiece.
            </card_1.CardDescription>
          </card_1.CardHeader>
          <form_1.Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <card_1.CardContent className="space-y-6">
                <form_1.FormField control={form.control} name="templateTitle" render={({ field }) => (<form_1.FormItem>
                      <form_1.FormLabel>Story Template</form_1.FormLabel>
                      <select_1.Select onValueChange={field.onChange} defaultValue={field.value}>
                        <form_1.FormControl>
                          <select_1.SelectTrigger>
                            <select_1.SelectValue placeholder="Choose a template..."/>
                          </select_1.SelectTrigger>
                        </form_1.FormControl>
                        <select_1.SelectContent>
                          {storyTemplates.map((template) => (<select_1.SelectItem key={template.id} value={template.title}>
                              {template.title}
                            </select_1.SelectItem>))}
                        </select_1.SelectContent>
                      </select_1.Select>
                      <form_1.FormMessage />
                    </form_1.FormItem>)}/>
                <form_1.FormField control={form.control} name="userInput" render={({ field }) => (<form_1.FormItem>
                      <form_1.FormLabel>Your Ideas (Keywords, Summary, or a Starting Snippet)</form_1.FormLabel>
                      <form_1.FormControl>
                        <textarea_1.Textarea placeholder="e.g., A young mage discovers a hidden power..." className="resize-none" rows={5} {...field}/>
                      </form_1.FormControl>
                      <form_1.FormMessage />
                    </form_1.FormItem>)}/>
              </card_1.CardContent>
              <card_1.CardFooter className="flex justify-end">
                <button_1.Button type="submit" disabled={isLoading} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  {isLoading ? (<>
                      <lucide_react_1.Sparkles className="mr-2 h-4 w-4 animate-spin"/>
                      Generating...
                    </>) : (<>
                      <lucide_react_1.Sparkles className="mr-2 h-4 w-4"/>
                      Generate Prompts
                    </>)}
                </button_1.Button>
              </card_1.CardFooter>
            </form>
          </form_1.Form>

          {prompts.length > 0 && (<div className="p-6 border-t">
              <h3 className="text-xl font-titles font-semibold mb-4 text-foreground">Suggested Prompts:</h3>
              <scroll_area_1.ScrollArea className="h-60 w-full rounded-md border p-4 bg-muted/50">
                <ul className="space-y-3">
                  {prompts.map((prompt, index) => (<li key={index} className="text-sm text-muted-foreground p-2 bg-background rounded-md shadow-sm">
                      {prompt}
                    </li>))}
                </ul>
              </scroll_area_1.ScrollArea>
            </div>)}
        </card_1.Card>
      </div>
    </section>);
};
exports.default = AiWritingPrompts;
//# sourceMappingURL=ai-writing-prompts.jsx.map