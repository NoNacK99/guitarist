document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('bg-video');
    const floatingTextElement = document.getElementById('floating-text');
    const playlistItems = document.querySelectorAll('#playlist li');
    const prevButton = document.getElementById('prev-track');
    const nextButton = document.getElementById('next-track');

    let currentTrackIndex = 0;
    let tracks = [];

    // Populate tracks from playlist items
    playlistItems.forEach((item, index) => {
        tracks.push({
            text: item.dataset.text || `Message for track ${index + 1}`,
            time: parseFloat(item.dataset.time), // Can be NaN if not set
            element: item
        });
        item.addEventListener('click', () => {
            playTrack(index);
        });
    });

    function updateFloatingText(text) {
        // Re-trigger CSS animation
        floatingTextElement.classList.remove('fade-in-text-animation');
        void floatingTextElement.offsetWidth; // Trigger reflow to restart animation
        floatingTextElement.textContent = text;
        floatingTextElement.classList.add('fade-in-text-animation');
    }

    function setActivePlaylistItem(index) {
        playlistItems.forEach(item => item.classList.remove('active'));
        if (tracks[index] && tracks[index].element) {
            tracks[index].element.classList.add('active');
        }
    }

    function playTrack(index, seekVideo = false) {
        if (index >= 0 && index < tracks.length) {
            currentTrackIndex = index;
            const track = tracks[currentTrackIndex];
            updateFloatingText(track.text);
            setActivePlaylistItem(currentTrackIndex);

            // Optional: If seekVideo is true and track has a time, jump video to that time
            if (seekVideo && !isNaN(track.time) && video.readyState >= video.HAVE_METADATA) {
                video.currentTime = track.time;
                if (video.paused) {
                    video.play().catch(e => console.error("Error playing video:", e));
                }
            }
        }
    }

    if (prevButton) {
        prevButton.addEventListener('click', () => {
            let newIndex = currentTrackIndex - 1;
            if (newIndex < 0) newIndex = tracks.length - 1; // Loop to last
            playTrack(newIndex, true); // Seek video when manually navigating
        });
    }

    if (nextButton) {
        nextButton.addEventListener('click', () => {
            let newIndex = (currentTrackIndex + 1) % tracks.length; // Loop to first
            playTrack(newIndex, true); // Seek video when manually navigating
        });
    }

    let previousTime = 0;
    let videoDuration = 0;

    video.addEventListener('loadedmetadata', () => {
        videoDuration = video.duration;
    });

    video.addEventListener('timeupdate', () => {
        const currentTime = video.currentTime;

        // Logic 1: Detect video loop and advance track
        // (currentTime is very small, previousTime was near the end)
        if (videoDuration > 0 && currentTime < 0.5 && previousTime > videoDuration - 0.5) {
            console.log("Video looped");
            let newIndex = (currentTrackIndex + 1) % tracks.length;
            playTrack(newIndex, false); // Don't seek when auto-advancing on loop
        }
        previousTime = currentTime;

        // Logic 2: Time-based track changes (if data-time is used)
        // Check if we should switch to a new track based on its defined time
        // This makes the playlist items act as cue points.
        for (let i = 0; i < tracks.length; i++) {
            if (!isNaN(tracks[i].time) && currentTime >= tracks[i].time) {
                // If this track's time is reached, and it's not the current one,
                // or if it's a "later" track than current according to time
                if (i !== currentTrackIndex) {
                    // Find the 'latest' track whose time has passed
                    let bestTrackIndex = i;
                    for (let j = i + 1; j < tracks.length; j++) {
                        if (!isNaN(tracks[j].time) && currentTime >= tracks[j].time) {
                            bestTrackIndex = j;
                        } else {
                            break; // Subsequent tracks are in the future
                        }
                    }
                    if (bestTrackIndex !== currentTrackIndex) {
                         // Only play if it's actually different to avoid rapid updates
                         // and only if the current track isn't already "further ahead"
                         // This part can be tricky if times are very close.
                         // A simpler approach might be to just find the *first* unplayed track past current time.
                         if(tracks[bestTrackIndex].time > (tracks[currentTrackIndex].time || -1) || currentTrackIndex === 0 && bestTrackIndex === 0 && currentTime < 1){
                            playTrack(bestTrackIndex, false); // Don't seek, let video play naturally
                         }
                    }
                }
            }
        }
    });

    // Attempt to play the video if autoplay is blocked
    video.play().catch(error => {
        console.warn("Autoplay was prevented. User interaction might be needed. Error:", error);
        // You could show a "Click to play" button here
    });

    // Initialize with the first track's text
    if (tracks.length > 0) {
        playTrack(0, true); // Seek to the start time of the first track on initial load
    }
});