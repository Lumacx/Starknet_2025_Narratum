'use client';

import type { FC } from 'react';
import { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { generateWritingPrompts, type GenerateWritingPromptsInput } from '@/ai/flows/generate-writing-prompts';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Feather } from 'lucide-react';
import { useLocale } from '@/context/LocaleContext';

type FormData = {
  templateTitle: string;
  userInput: string;
};

const AiWritingPrompts: FC = () => {
  const { t } = useLocale();
  const [prompts, setPrompts] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Build schema here so we can use translations
  const formSchema = z.object({
    templateTitle: z.string().min(1, { message: t('validation.template.required') }),
    userInput: z
      .string()
      .min(10, { message: t('validation.userInput.min').replace('{min}', '10') })
      .max(500, { message: t('validation.userInput.max').replace('{max}', '500') }),
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      templateTitle: '',
      userInput: '',
    },
  });

  const storyTemplates = [
    { id: 'hero_journey', title: t('templates.heroJourney') },
    { id: 'mystery_novel', title: t('templates.mysteryNovel') },
    { id: 'sci_fi_adventure', title: t('templates.sciFiAdventure') },
    { id: 'fantasy_quest', title: t('templates.fantasyQuest') },
    { id: 'romance_story', title: t('templates.romanceStory') },
  ];

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    setIsLoading(true);
    setPrompts([]);
    try {
      const input: GenerateWritingPromptsInput = {
        templateTitle: data.templateTitle,
        userInput: data.userInput,
      };
      const result = await generateWritingPrompts(input);
      if (result && result.writingPrompts) {
        setPrompts(result.writingPrompts);
        toast({
          title: t('aiPrompts.toastSuccessTitle'),
          description: t('aiPrompts.toastSuccessDesc'),
        });
      } else {
        throw new Error(t('aiPrompts.error.noPrompts'));
      }
    } catch (error) {
      console.error('Error generating prompts:', error);
      toast({
        variant: 'destructive',
        title: t('aiPrompts.toastErrorTitle'),
        description:
          (error as Error).message || t('aiPrompts.toastErrorDescFallback'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section aria-labelledby="ai-prompts-title" className="py-8 md:py-12">
      <div className="container mx-auto px-4">
        <Card className="w-full max-w-2xl mx-auto shadow-xl">
          <CardHeader>
            <div className="flex items-center space-x-3 mb-2">
              <Feather className="h-8 w-8 text-accent" />
              <CardTitle id="ai-prompts-title" className="text-2xl md:text-3xl font-titles">
                {t('aiPrompts.title')}
              </CardTitle>
            </div>
            <CardDescription>
              {t('aiPrompts.description')}
            </CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="templateTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('aiPrompts.storyTemplate')}</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('aiPrompts.chooseTemplate')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {storyTemplates.map((template) => (
                            <SelectItem key={template.id} value={template.title}>
                              {template.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="userInput"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('aiPrompts.yourIdeasLabel')}</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={t('aiPrompts.yourIdeasPlaceholder')}
                          className="resize-none"
                          rows={5}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button type="submit" disabled={isLoading} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  {isLoading ? (
                    <>
                      <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                      {t('aiPrompts.generating')}
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      {t('aiPrompts.generate')}
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Form>

          {prompts.length > 0 && (
            <div className="p-6 border-t">
              <h3 className="text-xl font-titles font-semibold mb-4 text-foreground">
                {t('aiPrompts.suggestedPrompts')}
              </h3>
              <ScrollArea className="h-60 w-full rounded-md border p-4 bg-muted/50">
                <ul className="space-y-3">
                  {prompts.map((prompt, index) => (
                    <li key={index} className="text-sm text-muted-foreground p-2 bg-background rounded-md shadow-sm">
                      {prompt}
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            </div>
          )}
        </Card>
      </div>
    </section>
  );
};

export default AiWritingPrompts;
