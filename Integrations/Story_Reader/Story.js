// --- Configuration ---
const IMAGE_PATH = 'images/';
const COVER_IMAGE = 'cover.png';
const AUDIO_PATH = 'audio/';
const PAGE_FLIP_SOUND = 'page-flip.mp3'; // Keep if desired for arrows
const BACKGROUND_MUSIC = 'background-music.mp3'; // Your music file name
const BACKGROUND_IMAGE_PATH = 'backgrounds/';
const NOTES_PATH = 'notes/';
const AVATAR_PATH = 'avatars/';

const TOTAL_CONTENT_PAGES = 10; // Or 38
const PAGE_IMAGES = Array.from({ length: TOTAL_CONTENT_PAGES }, (_, i) => `page${i + 1}.png`);
const NARRATION_FILE_BASE = 'narration_';

// --- Global Variables ---
// Remove scene, camera, renderer, bookGroup, pages
let pageNotes = [];
let currentPageIndex = 0; // 0 = Cover state
// Remove isAnimating (no complex animations)
// Remove totalSheets

// --- DOM Element References ---
let loadingScreen, arrowLeft, arrowRight, textBubble, pageNumberDisplay;
// *** Remove backgroundSelect from main refs ***
let /*backgroundSelect,*/  /*restartButton,*/startButton;
let welcomeText, optionsButtonNew, optionsPopup, closePopupButton, popupBackgroundSelect,
    narratorSelect, createStoryButton, backHomeButton, avatarContainer, avatarImage,
    startStoryButton, imagePanel, storyImage, readAgainButton, pageInfo,
    fontSettingsButton, brushButton; // <<< ADD font and brush buttons

let playMusicButton;

let audioProgressBar; // New reference for the progress bar fill

// Remove defaultBackgroundColor (handle via CSS/direct color vals)

// --- Audio Elements ---
let pageTurnSound; // Optional for arrows
let backgroundMusic; // <<< REINSTATE
let narrationSounds = [];
let currentNarration = null;
let musicPlaying = false, userInteracted = false; // Background music removed from scope
let narrationTimeoutId = null; // To clear pending narration plays
// --- State Variables ---
// Remove isLooping, loopTimeoutId
let currentAvatar = 'Default';
let currentFontSize = 1.0; // <<< NEW STATE for font size multiplier (1.0 = 100%)

// --- Event Listener References (for cleanup) ---
// It's good practice to store references to listeners if you need to remove them specifically.
// For 'timeupdate' and 'ended', we'll add/remove them directly on the audio element.
const timeUpdateListener = () => updateAudioProgress();
const endedListener = () => handleAudioEnd();

// --- Initialization ---
function init() {
    console.log("Initializing Story App...");
    // --- Get DOM References ---
    loadingScreen = document.getElementById('loading-screen');
    arrowLeft = document.getElementById('arrow-left');
    arrowRight = document.getElementById('arrow-right');
    textBubble = document.getElementById('text-bubble');
    // pageNumberDisplay = document.getElementById('page-number'); // Replaced by pageInfo
    // backgroundSelect = document.getElementById('background-select'); // Removed from main UI
    startStoryButton = document.getElementById('start-story-button'); // New Start Button
    // restartButton = document.getElementById('restart-button'); // Removed
    welcomeText = document.getElementById('welcome-text');
    optionsButtonNew = document.getElementById('options-button-new'); // New ID for gear icon
    optionsPopup = document.getElementById('options-popup');
    closePopupButton = document.getElementById('close-popup-button');
    popupBackgroundSelect = document.getElementById('popup-background-select');
    narratorSelect = document.getElementById('narrator-select');
    createStoryButton = document.getElementById('create-story-button');
    backHomeButton = document.getElementById('back-home-button');
    // avatarContainer = document.getElementById('avatar-container');
    avatarImage = document.getElementById('avatar-image');
    // imagePanel = document.getElementById('image-panel');
    storyImage = document.getElementById('story-image');
    readAgainButton = document.getElementById('read-again-button');
    pageInfo = document.getElementById('page-info'); // New element for page number

     // <<< GET NEW BUTTON REFS >>>
     fontSettingsButton = document.querySelector('.header-icon-btn[aria-label="Font Settings"]');
     brushButton = document.querySelector('.header-icon-btn[aria-label="Drawing Tools"]'); // Assuming brush opens BG popup
     playMusicButton = document.getElementById('play-music-button');
     audioProgressBar = document.getElementById('audio-progress-bar'); // Get progress bar
    // --- End DOM Refs ---

    if (!storyImage || !textBubble || !pageInfo || !avatarImage) {
        console.error("Essential UI elements not found! Aborting.");
        if(loadingScreen) loadingScreen.textContent = "Error initializing UI.";
        return;
    }

    if (welcomeText) welcomeText.textContent = "Welcome!"; // Placeholder

    // --- Start Loading Assets (Notes & Narration) ---
    loadAssets().then(() => {
        console.log("Notes and Narration loaded successfully!");
        setupAudio(); // Setup narration volume etc.
        updateUI(); // Display initial cover state
        if (loadingScreen) loadingScreen.style.display = 'none';
        // No 3D rendering loop needed

        // --- Add Event Listeners ---
        arrowLeft.addEventListener('click', previousPage); // Use new function
        arrowRight.addEventListener('click', nextPage);   // Use new function
        startStoryButton.addEventListener('click', startStory); // New function
        /*readAgainButton.addEventListener('click', () => playNarration(currentPageIndex));*/
        readAgainButton.addEventListener('click', replayCurrentNarration); // Use specific handler
        optionsButtonNew.addEventListener('click', toggleOptionsPopup);
        closePopupButton.addEventListener('click', toggleOptionsPopup);
        popupBackgroundSelect.addEventListener('change', handleBackgroundChange);
        narratorSelect.addEventListener('change', handleNarratorChange);
        createStoryButton.addEventListener('click', () => window.location.href = 'https://studioswai.com/index.php/swai-consulting/');
        backHomeButton.addEventListener('click', () => window.location.href = 'https://studioswai.com');
        
        // <<< ADD NEW LISTENERS >>>
        if (fontSettingsButton) fontSettingsButton.addEventListener('click', cycleFontSize);
        if (brushButton) brushButton.addEventListener('click', toggleOptionsPopup); // Make brush open options too
        
        // Basic Interaction Listener for Audio Context
        window.addEventListener('click', () => { userInteracted = true; }, { once: true });
        window.addEventListener('touchend', () => { userInteracted = true; }, { once: true });

        // *** MODIFY Music Button Listener ***
        if (playMusicButton) {
            playMusicButton.addEventListener('click', toggleBackgroundMusic); // Use new handler
            }   

        //if (playMusicButton) {
         //   playMusicButton.addEventListener('click', () => {
         //       userInteracted = true; // Ensure flag is set
         //       attemptPlayMusic();
         //       // Optionally hide the button after first successful play
         //       if (musicPlaying) playMusicButton.style.display = 'none';
         //   });
        //}

    }).catch(error => {
        console.error("Error loading assets:", error);
        if (loadingScreen) loadingScreen.textContent = 'Error loading story assets.';
    });

} // end init

// --- NEW First Interaction Handler ---
function handleFirstInteraction() {
    if (userInteracted) return;
    console.log("First user interaction detected.");
    userInteracted = true;
    // Now try to play background music
    //attemptPlayMusic();//
}

// --- Asset Loading Function (Notes & Narration ONLY) ---
function loadAssets() {
    console.log("Loading notes and narration...");
    if (loadingScreen) loadingScreen.textContent = "Loading story data...";

     // --- Audio Loading Promises (ADD BG Music and Flip Sound) ---
     const basicAudioFiles = [
        { name: 'pageTurn', src: AUDIO_PATH + PAGE_FLIP_SOUND },       // <<< ADDED
        { name: 'background', src: AUDIO_PATH + BACKGROUND_MUSIC }   // <<< ADDED
    ];

    // Narration files (Cover + Pages + End)
    const narrationFilesToLoad = TOTAL_CONTENT_PAGES + 2;
    const narrationFilePromises = Array.from({ length: narrationFilesToLoad }, (_, i) => ({
        name: `narration_${i}`, src: `${AUDIO_PATH}${NARRATION_FILE_BASE}${i}.mp3`
    }));
    
    const allAudioFiles = [...basicAudioFiles, ...narrationFilePromises]; // Combine all
    
    const audioPromises = allAudioFiles.map(audioInfo => new Promise((resolve, reject) => {
        const audio = new Audio(); audio.preload = 'auto';
        audio.addEventListener('canplaythrough', () => {
            console.log(`Audio ready: ${audioInfo.name}`);
            // *** Explicit Assignment ***
            switch (audioInfo.name) {
                case 'pageTurn':
                    pageTurnSound = audio;
                    console.log(">>> pageTurnSound object assigned:", !!pageTurnSound);
                    break;
                case 'background':
                    backgroundMusic = audio;
                    console.log(">>> backgroundMusic object assigned:", !!backgroundMusic);
                    break;
                default:
                    if (audioInfo.name.startsWith('narration_')) {
                        const index = parseInt(audioInfo.name.split('_')[1], 10);
                        if (!isNaN(index)) {
                             narrationSounds[index] = audio;
                        } else { console.error(`Failed to parse index from ${audioInfo.name}`); }
                    }
                    break; // End default case
            }
            resolve(audio); // Resolve the promise
        }, { once: true }); // End canplaythrough listener

        audio.addEventListener('error', (e) => {
            console.warn(`Could not load: ${audioInfo.src}`);
            resolve(null); // Resolve null on error
        }, { once: true }); // End error listener

        audio.src = audioInfo.src;
        audio.load();
    })); // End audioPromises.map


    // Text Note Loading Promises (Cover + Pages + End)
    const noteFilesToLoad = TOTAL_CONTENT_PAGES + 2;
    const notePromises = Array.from({ length: noteFilesToLoad }, (_, i) => {
        const noteURL = `${NOTES_PATH}Note_${i}.txt?v=1.0`; // Add cache bust
        return fetch(noteURL)
            .then(response => {
                if (!response.ok) { throw new Error(`HTTP error! status: ${response.status} for ${noteURL}`); }
                return response.text();
            })
            .then(text => text.trim()) // Trim whitespace
            .catch(error => {
                console.error(`Failed to load note: ${noteURL}`, error);
                return `[Error loading Note ${i}]`;
            });
    });

    // Wait for both notes and audio
    const allPromises = [...audioPromises, ...notePromises];

    return Promise.all(allPromises).then(results => {
        // Audio is assigned globally via side effect
        // Assign notes to the global array (they are the last part of results)
        pageNotes = results.slice(audioPromises.length);
        console.log(`Loaded ${pageNotes.length} notes.`);
        console.log(`Loaded ${narrationSounds.filter(Boolean).length} narration files.`);
        if (pageTurnSound) console.log("Page turn sound loaded.");
        if (backgroundMusic) console.log("Background music loaded.");
    });

} // end loadAssets


// --- Setup Audio ---
function setupAudio() {
    console.log("Setting up audio..."); // Log start
    narrationSounds.forEach(sound => { if (sound) sound.volume = 1.0; });
    if (backgroundMusic) {
        console.log("Setting up background music loop/volume."); // Log specific setup
        backgroundMusic.loop = true;
        backgroundMusic.volume = 0.15;
    } else {
        console.warn("Background music object NOT found during setup."); // Log if missing
    }
     if (pageTurnSound) {
         console.log("Setting up page turn sound volume."); // Log specific setup
         pageTurnSound.volume = 0.5;
     } else {
         console.warn("Page turn sound object NOT found during setup."); // Log if missing
     }
        // Set initial icon state after loading
    updateMusicButtonIcon();
}

// --- Attempt Play Music (MODIFIED - called by interaction handler) ---
function attemptPlayMusic() {
    // Log state BEFORE the check
    console.log(`Attempting play: backgroundMusic=${!!backgroundMusic}, musicPlaying=${musicPlaying}, userInteracted=${userInteracted}`);
    if (backgroundMusic && !musicPlaying && userInteracted) {
        console.log("Conditions met. Calling backgroundMusic.play()..."); // Log call
        backgroundMusic.play().then(() => {
            musicPlaying = true;
            console.log("Background music started successfully."); // Log success
            updateMusicButtonIcon(); // Update icon on success
        }).catch(error => {
            console.warn("Background music play() FAILED:", error.message, error); // Log failure details
            musicPlaying = false;
            updateMusicButtonIcon(); // Update icon even on failure
        });
    } else {
         console.log("Conditions NOT met for playing background music."); // Log why not
    }
}

// --- NEW: Toggle Background Music Handler ---
function toggleBackgroundMusic() {
    userInteracted = true; // Click is interaction
    if (!backgroundMusic) {
        console.warn("Background music not loaded yet.");
        return;
    }

    if (musicPlaying) {
        // Music is playing, so pause it
        console.log("Pausing background music.");
        backgroundMusic.pause();
        musicPlaying = false;
    } else {
        // Music is not playing, so attempt to play it
        // attemptPlayMusic handles the checks for userInteracted and existing playback
        attemptPlayMusic();
    }
    // Update icon regardless of success/failure of play() attempt
    updateMusicButtonIcon();
}

// --- NEW: Update Music Button Icon ---
function updateMusicButtonIcon() {
    if (playMusicButton) {
        const icon = playMusicButton.querySelector('i'); // Get the <i> element
        if (icon) {
            if (musicPlaying) {
                icon.classList.remove('fa-volume-up');
                icon.classList.add('fa-volume-mute'); // Show mute icon
                playMusicButton.setAttribute('aria-label', 'Mute Music');
            } else {
                icon.classList.remove('fa-volume-mute');
                icon.classList.add('fa-volume-up'); // Show play icon
                playMusicButton.setAttribute('aria-label', 'Play Music');
            }
        }
         // Ensure button is visible
         playMusicButton.style.display = ''; // Remove inline style if previously hidden
    }
}

// --- Background Change Handler (Applies to body) ---
function handleBackgroundChange(event) {
    const selectedValue = event.target.value;
    console.log("Background changed to:", selectedValue);

    // Sync the other select dropdown (If keeping popup select)
    // if (event.target.id === 'popup-background-select') { /* sync other if exists */ }

    if (selectedValue) {
        const imageURL = BACKGROUND_IMAGE_PATH + selectedValue;
        document.body.style.backgroundImage = `url('${imageURL}')`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
        document.body.style.backgroundRepeat = 'no-repeat';
    } else {
        // Revert to default color (e.g., the dark teal/black)
        document.body.style.backgroundImage = 'none';
        document.body.style.backgroundColor = '#1a2e2a'; // Or your chosen black/dark color
        console.log("Background reverted to default color.");
    }
}

// --- Options Pop-up Toggle ---
function toggleOptionsPopup() {
    console.log("toggleOptionsPopup called");
    if (optionsPopup) {
        optionsPopup.classList.toggle('visible');
        if (optionsPopup.classList.contains('visible')) {
             // Sync dropdowns when opening
             if(popupBackgroundSelect) { /* Sync BG select value */ }
             if(narratorSelect) narratorSelect.value = currentAvatar;
        }
    } else { console.error("optionsPopup element not found!"); }
}

// --- Narrator Change Handler ---
function handleNarratorChange(event) {
    currentAvatar = event.target.value;
    console.log("Narrator changed to:", currentAvatar);
    updateAvatar();
    // Add logic here if different narrators use different audio files
}

// --- Update Avatar Function ---
function updateAvatar() {
    if (avatarImage) {
        const avatarURL = `${AVATAR_PATH}${currentAvatar}.png`;
        avatarImage.src = avatarURL;
        avatarImage.alt = `${currentAvatar} Avatar`;
        console.log("Avatar image updated to:", avatarURL);
    }
}

// --- Play Narration (Add delay logic) ---
// --- Narration Playback & Progress ---
function playNarration(index, delay = 50) {
    if (narrationTimeoutId) clearTimeout(narrationTimeoutId);

    const soundToPlay = narrationSounds[index];

    // Clean up listeners from any *previous* narration sound
    if (currentNarration && currentNarration !== soundToPlay) {
        currentNarration.removeEventListener('timeupdate', timeUpdateListener);
        currentNarration.removeEventListener('ended', endedListener);
        currentNarration.pause(); // Stop it if it was different
        currentNarration.currentTime = 0;
    }
    
    // Reset progress bar and arrow glow for new narration
    if (audioProgressBar) audioProgressBar.style.width = '0%';
    if (arrowRight) arrowRight.classList.remove('arrow-glow');


    if (!soundToPlay) {
        console.warn(`Narration sound for index ${index} not loaded or found.`);
        currentNarration = null; // Ensure currentNarration is nulled if no sound
        return;
    }

    // If the sound we want to play is already playing and is the current one, let it be.
    if (currentNarration === soundToPlay && !currentNarration.paused && !currentNarration.ended) {
        console.log(`Narration ${index} is already playing. Not restarting.`);
        return;
    }
    
    // If it's the same sound but paused/ended, we will restart it.
    // If it's a different sound, currentNarration would have been paused/reset above.

    narrationTimeoutId = setTimeout(() => {
        console.log(`Playing narration_${index}.mp3 (after ${delay}ms delay)`);
        soundToPlay.currentTime = 0;
        soundToPlay.play().then(() => {
            currentNarration = soundToPlay; // Update currentNarration to the one now playing
            // Add fresh listeners to the new currentNarration
            currentNarration.addEventListener('timeupdate', timeUpdateListener);
            currentNarration.addEventListener('ended', endedListener);
            console.log(`Narration ${index} started playing.`);
        }).catch(e => {
            console.warn(`Narration ${index} play failed:`, e.message);
            if (currentNarration === soundToPlay) { // If play failed for the one we intended
                currentNarration.removeEventListener('timeupdate', timeUpdateListener); // Clean up listeners
                currentNarration.removeEventListener('ended', endedListener);
                currentNarration = null; // Nullify because it failed
            }
        });
        narrationTimeoutId = null;
    }, delay);
}

function replayCurrentNarration() {
    console.log("Replay narration requested for index:", currentPageIndex);
    // Resetting currentNarration here forces playNarration to restart the sound
    // and re-attach listeners, which is cleaner.
    if(currentNarration) {
        currentNarration.removeEventListener('timeupdate', timeUpdateListener);
        currentNarration.removeEventListener('ended', endedListener);
        // No need to pause currentNarration here, playNarration will handle it if it's different
        // or if it's the same, it will restart it.
    }
    // currentNarration = null; // This would make it always restart fully.
                            // The current logic in playNarration handles restart if paused/ended.
    playNarration(currentPageIndex, 0);
}

function updateAudioProgress() {
    if (currentNarration && audioProgressBar && currentNarration.duration > 0) { // Check duration > 0 to avoid NaN
        const progress = (currentNarration.currentTime / currentNarration.duration) * 100;
        audioProgressBar.style.width = progress + '%';
    } else if (audioProgressBar) {
        // Reset if no current narration or duration is 0 (e.g. audio not loaded properly)
        audioProgressBar.style.width = '0%';
    }
}

function handleAudioEnd() {
    console.log("Audio ended for page:", currentPageIndex);
    if (audioProgressBar) audioProgressBar.style.width = '100%'; // Show full bar

    // Add glow to the right arrow if it's visible (i.e., not on the last page)
    const endStateIndex = TOTAL_CONTENT_PAGES + 1;
    if (arrowRight && currentPageIndex > 0 && currentPageIndex < endStateIndex && !arrowRight.classList.contains('hidden')) {
        arrowRight.classList.add('arrow-glow');
    }

    // Listeners are removed from currentNarration when a new sound plays or if replayCurrentNarration is called.
    // The specific instance of 'ended' for *this* playback is now done.
    // If the same sound is replayed, new listeners will be added.
}


// --- Page Navigation ---
function nextPage() {
    const maxIndex = TOTAL_CONTENT_PAGES + 1; // Cover (0) + Pages (1-TOTAL) + End (TOTAL+1)
    if (currentPageIndex < maxIndex) {
        if (pageTurnSound) { pageTurnSound.currentTime = 0; pageTurnSound.play().catch(e => console.warn("Page turn sound failed", e)); }
        currentPageIndex++;
        updateUI(); // This will call playNarration, which handles progress bar and glow reset
        if (currentPageIndex === 1 && userInteracted && !musicPlaying) { // Moving from cover to first page
            attemptPlayMusic();
        }
    }
}
// Add similar log to previousPage
function previousPage() {
    if (currentPageIndex > 0) {
        console.log(`PrevPage: Triggering sound. pageTurnSound object exists? ${!!pageTurnSound}`); // Log before play
        if (pageTurnSound) { pageTurnSound.currentTime = 0; pageTurnSound.play().catch(e => {console.warn("Page turn sound play failed:", e.message)}); }
        currentPageIndex--;
        updateUI();
    }
}
// --- NEW Start Story Function ---
function startStory() {
    console.log("Start Story clicked");
    if (currentPageIndex === 0) {
        // *** Try starting music directly here too ***
        // This relies on the click on the button being the user interaction
        userInteracted = true; // Explicitly set on button click
        attemptPlayMusic();
        // *** End Music Trigger ***

       nextPage();
   }
    // Optionally hide start button after first click?
    // if(startStoryButton) startStoryButton.classList.add('hidden');
}

// --- NEW Font Size Cycle Function ---
function cycleFontSize() {
    console.log("Cycling font size. Current multiplier:", currentFontSize);
    // Cycle through sizes: 1.0 -> 1.2 -> 1.4 -> 0.8 -> 1.0
    if (currentFontSize === 1.0) {
        currentFontSize = 1.2;
    } else if (currentFontSize === 1.2) {
        currentFontSize = 1.4;
    } else if (currentFontSize === 1.4) {
        currentFontSize = 0.8;
    } else { // Includes 0.8 or any unexpected value
        currentFontSize = 1.0;
    }
    console.log("New font size multiplier:", currentFontSize);
    updateTextBubbleFontSize();
}

function updateTextBubbleFontSize() {
     if (textBubble) {
         // Base font size is defined in CSS (e.g., using clamp)
         // We apply the multiplier using CSS custom property or direct style
         textBubble.style.setProperty('--font-size-multiplier', currentFontSize); // Option 1: CSS Var
         // OR Option 2: Direct style (might override clamp less predictably)
         // textBubble.style.fontSize = `calc(${getBaseFontSize()} * ${currentFontSize})`;
         console.log("Applied font size multiplier via CSS variable.");
     }
}

// --- Update UI Function (Major Rewrite) ---
function updateUI() {
    console.log(`Updating UI for page index: ${currentPageIndex}`);
     if (!storyImage || !textBubble || !pageInfo || !avatarImage || !arrowLeft || !arrowRight || !readAgainButton || !audioProgressBar) {
        console.error("Cannot update UI - essential elements missing.");
        return;
    }

     // Reset arrow glow and progress bar at the start of any UI update
    // playNarration will also do this, but good for belt-and-suspenders
    if (arrowRight) arrowRight.classList.remove('arrow-glow');
    if (audioProgressBar) audioProgressBar.style.width = '0%';

    const endStateIndex = TOTAL_CONTENT_PAGES + 1; // e.g., 19 for 18 pages
    let currentText = "";
    let pageNumStr = "";
    let imageSrc = "";
    let isEndState = (currentPageIndex >= endStateIndex);
    let isCover = (currentPageIndex === 0);

    if (isCover) {
        imageSrc = IMAGE_PATH + COVER_IMAGE;
        currentText = pageNotes[0] || "[Cover Text Missing]";
        pageNumStr = "Cover";
    } else if (isEndState) {
        imageSrc = IMAGE_PATH + PAGE_IMAGES[TOTAL_CONTENT_PAGES - 1]; // Show last page image
        currentText = pageNotes[endStateIndex] || "[End Text Missing]";
        pageNumStr = `The End`;
    } else { // Regular content pages
        imageSrc = IMAGE_PATH + PAGE_IMAGES[currentPageIndex - 1];
        currentText = pageNotes[currentPageIndex] || `[Note ${currentPageIndex} Missing]`;
        pageNumStr = `Page ${currentPageIndex} of ${TOTAL_CONTENT_PAGES}`;
    }
     // Update DOM
     storyImage.src = imageSrc; storyImage.alt = `Story Page ${currentPageIndex}`;
     textBubble.textContent = currentText; pageInfo.textContent = pageNumStr;
     updateAvatar();
 
     // Update Arrow Visibility
     arrowLeft.classList.toggle('hidden', currentPageIndex <= 0);
     arrowRight.classList.toggle('hidden', isEndState);
 
     // Show/Hide Start Story Button vs Read Again Button
     if(startStoryButton) startStoryButton.style.display = (currentPageIndex === 0) ? 'block' : 'none';
     // *** FIX for Read Again Button ***
     if(readAgainButton) {
        readAgainButton.classList.toggle('hidden', currentPageIndex === 0);
        readAgainButton.textContent = isEndState ? "Read it Again?" : "Read it again";

         // *** THIS BLOCK IS LIKELY AROUND LINE 285 ***
         if (isEndState) { // <--- Check syntax here and lines JUST before
             readAgainButton.onclick = () => {
                 console.log("Read Again? button clicked on end page. Resetting.");
                 currentPageIndex = 0;
                 updateUI();
             };
         } else {
              readAgainButton.onclick = replayCurrentNarration;
         }
     }
     // *** END FIX ***
 
     // Manage progress bar visibility based on page type
    const progressContainer = document.getElementById('audio-progress-container');
    if (progressContainer) {
        if (isCover || isEndState) { // Hide progress bar on cover and end page
            progressContainer.style.visibility = 'hidden';
        } else {
            progressContainer.style.visibility = 'visible';
        }
    }

      // Play Narration (only if user has interacted)
   if (userInteracted && !isCover) { // Don't auto-play narration for cover here, only for pages.
                                      // Narration for page 0 (cover) will play if startStory calls nextPage -> updateUI -> playNarration(0)
        playNarration(currentPageIndex);
    } else if (isCover && userInteracted && pageNotes[0] && narrationSounds[0]) {
        // If we want the cover page to also have narration when it's first shown *after interaction*
        // but before "Start Story" is clicked. This might be too eager.
        // For now, cover narration is implicitly handled if updateUI(0) calls playNarration(0).
        // The current logic: cover narration plays if you navigate *back* to cover.
        // When "Start Story" is clicked, it goes to page 1, and page 1's narration plays.
    }

    // Apply current font size
    updateTextBubbleFontSize();
}
 // --- Reset Function ---
function resetToCover() {
    if (currentNarration && !currentNarration.paused) {
        currentNarration.pause();
        currentNarration.currentTime = 0;
        currentNarration.removeEventListener('timeupdate', timeUpdateListener);
        currentNarration.removeEventListener('ended', endedListener);
        currentNarration = null;
    }
    if (narrationTimeoutId) clearTimeout(narrationTimeoutId);
    if (audioProgressBar) audioProgressBar.style.width = '0%';
    if (arrowRight) arrowRight.classList.remove('arrow-glow');
    
    currentPageIndex = 0;
    updateUI();
 }
 
 
 // --- Start ---
 init(); // Call initialization