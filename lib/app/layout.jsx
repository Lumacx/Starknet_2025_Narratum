"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.default = RootLayout;
const google_1 = require("next/font/google");
require("./globals.css");
const toaster_1 = require("@/components/ui/toaster"); // Import Toaster
const cinzel = (0, google_1.Cinzel)({
    subsets: ['latin'],
    variable: '--font-cinzel',
    weight: ['400', '700'], // Specify weights if needed
});
const openSans = (0, google_1.Open_Sans)({
    subsets: ['latin'],
    variable: '--font-open-sans',
    weight: ['400', '700'], // Specify weights if needed
});
exports.metadata = {
    title: 'Narratum', // Updated App Name
    description: 'Immersive storytelling platform by Narratum', // Updated description
};
function RootLayout({ children, }) {
    return (<html lang="en">
      <body className={`${cinzel.variable} ${openSans.variable} font-sans antialiased`}>
        {children}
        <toaster_1.Toaster />
      </body>
    </html>);
}
//# sourceMappingURL=layout.jsx.map