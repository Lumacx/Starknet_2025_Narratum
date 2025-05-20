"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = HomePage;
function HomePage() {
    return (<><header>
      <h1>Narratum - AI Image & GIF Generation</h1>
    </header><main className="container">
        <section className="input-panel">
          <h2>Describe or Sketch Your Scene/Character</h2>

          <div className="input-group">
            <label htmlFor="textDescription">Text Description:</label>
            <textarea id="textDescription" rows={5} placeholder="e.g., A majestic dragon flying over a misty mountain range at sunset."></textarea>
          </div>

          <div className="input-group">
            <label>Sketch (Optional):</label>
            <div className="canvas-controls">
              <button id="clearSketchBtn" title="Clear Sketch">Clear</button>
              <label htmlFor="strokeColor">Color:</label>
              <input type="color" id="strokeColor" defaultValue="#000000"/>
              <label htmlFor="strokeWidth">Width:</label>
              <input type="range" id="strokeWidth" min="1" max="20" defaultValue="3"/>
            </div>
            <canvas id="sketchCanvas" width="400" height="300"></canvas>
          </div>

          <button id="generateImageBtn" className="action-btn">
            <img src="https://api.iconify.design/mdi:lightbulb-on-outline.svg?color=%23ffffff" alt="" style={{ height: '1em', verticalAlign: 'middle' }}/>
            Generate Image (with Gemini)
          </button>
        </section>

        <section className="output-panel">
          <h2>Generated Output</h2>
          <div id="imageOutputContainer">
            <p id="placeholderText">Your generated image will appear here.</p>
            <img id="generatedImage" src="#" alt="Generated Image" style={{ display: 'none' }}/>
            <div id="loadingSpinner" style={{ display: 'none' }}>
              <div className="spinner"></div>
              <p>Generating, please wait...</p>
            </div>
          </div>

          <div className="output-controls">
            <button id="retryBtn" className="action-btn" disabled>Retry</button>
            <button id="saveImageBtn" className="action-btn" disabled>Save Image</button>
            <button id="generateGifBtn" className="action-btn" disabled>Generate GIF (with Veo2)</button>
          </div>
          <div id="gifOutputContainer" style={{ display: 'none', marginTop: '20px' }}>
            <h3>Generated GIF:</h3>
            <img id="generatedGif" src="#" alt="Generated GIF" style={{ maxWidth: '100%', border: '1px solid #ccc' }}/>
            <p id="gifLoadingSpinner" style={{ display: 'none' }}>Generating GIF...</p>
          </div>
        </section>
      </main><footer>
        <p>&copy; Narratum Storytelling Tool</p>
      </footer></>);
}
//# sourceMappingURL=page.jsx.map