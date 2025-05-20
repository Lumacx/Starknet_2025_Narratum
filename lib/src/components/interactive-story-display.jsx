"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const card_1 = require("@/components/ui/card");
const image_1 = __importDefault(require("next/image"));
const InteractiveStoryDisplay = () => {
    return (<section aria-labelledby="interactive-story-title" className="py-8 md:py-12">
      <div className="container mx-auto px-4">
        <h2 id="interactive-story-title" className="text-3xl md:text-4xl font-titles font-bold text-center mb-8 text-foreground">
          Featured Story
        </h2>
        <card_1.Card className="w-full max-w-2xl mx-auto shadow-xl overflow-hidden">
          <card_1.CardHeader className="p-0">
             <image_1.default src="https://picsum.photos/800/400" alt="Fantasy landscape" width={800} height={400} className="w-full h-auto object-cover" data-ai-hint="fantasy landscape"/>
          </card_1.CardHeader>
          <card_1.CardContent className="p-6">
            <card_1.CardTitle className="text-2xl font-titles mb-2">The Lost Amulet of Eldoria</card_1.CardTitle>
            <card_1.CardDescription className="text-base mb-4">
              Embark on a perilous journey through enchanted forests and treacherous mountains to find the legendary Lost Amulet. Your choices will shape your destiny.
            </card_1.CardDescription>
            <p className="text-muted-foreground text-sm">
              This is a placeholder for the interactive story display. Actual story content and navigation controls will be implemented here.
            </p>
          </card_1.CardContent>
        </card_1.Card>
      </div>
    </section>);
};
exports.default = InteractiveStoryDisplay;
//# sourceMappingURL=interactive-story-display.jsx.map