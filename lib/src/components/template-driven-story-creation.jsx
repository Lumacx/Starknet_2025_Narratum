"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ai_writing_prompts_1 = __importDefault(require("./ai-writing-prompts"));
const card_1 = require("@/components/ui/card");
const lucide_react_1 = require("lucide-react"); // Fantasy-inspired icon
const TemplateDrivenStoryCreation = () => {
    return (<section aria-labelledby="story-creation-title" className="py-8 md:py-12 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8 md:mb-12">
          <lucide_react_1.Wand2 className="h-12 w-12 text-accent mx-auto mb-4"/>
          <h2 id="story-creation-title" className="text-3xl md:text-4xl font-titles font-bold text-foreground">
            Craft Your Narrative
          </h2>
          <p className="mt-2 text-lg text-muted-foreground max-w-2xl mx-auto">
            Bring your stories to life with our guided templates and AI-powered writing assistance.
          </p>
        </div>
        
        {/* Placeholder for Template Selection and Editor */}
        <card_1.Card className="w-full max-w-3xl mx-auto mb-12 shadow-xl">
          <card_1.CardHeader>
            <card_1.CardTitle className="text-2xl font-titles">Story Editor</card_1.CardTitle>
            <card_1.CardDescription>
              This is where you'll select a template and write your story. Content fields for text, images, and choices will appear based on the chosen template.
            </card_1.CardDescription>
          </card_1.CardHeader>
          <card_1.CardContent>
            <div className="h-64 bg-muted rounded-md flex items-center justify-center">
              <p className="text-muted-foreground">Story Editor Interface Placeholder</p>
            </div>
          </card_1.CardContent>
        </card_1.Card>

        {/* AI Writing Prompts Component */}
        <ai_writing_prompts_1.default />
      </div>
    </section>);
};
exports.default = TemplateDrivenStoryCreation;
//# sourceMappingURL=template-driven-story-creation.jsx.map