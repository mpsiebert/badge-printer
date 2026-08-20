const ICON_CATEGORIES = [
    { id: 'music', label: 'Music', emoji: '🎵' },
    { id: 'books', label: 'Books', emoji: '📚' },
    { id: 'sports', label: 'Sports', emoji: '⚽️' },
    { id: 'art', label: 'Art', emoji: '🎨' },
    { id: 'gaming', label: 'Gaming', emoji: '🎮' },
    { id: 'cooking', label: 'Cooking', emoji: '🍳' },
    { id: 'travel', label: 'Travel', emoji: '✈️' },
    { id: 'photography', label: 'Photography', emoji: '📷' },
    { id: 'nature', label: 'Nature', emoji: '🌿' },
    { id: 'science', label: 'Science', emoji: '🔬' },
    { id: 'tech', label: 'Tech', emoji: '💻' },
    { id: 'coffee', label: 'Coffee', emoji: '☕' },
    { id: 'pets', label: 'Pets', emoji: '🐾' },
    { id: 'film', label: 'Film', emoji: '🎬' },
    { id: 'dance', label: 'Dance', emoji: '💃' }
];

document.addEventListener('DOMContentLoaded', () => {
    const firstNameInput = document.getElementById('firstName');
    const titleInput = document.getElementById('title');
    const customPronounsInput = document.getElementById('customPronouns');
    const pronounChips = document.querySelectorAll('.pronoun-chip');
    const iconGrid = document.getElementById('iconGrid');
    const maxError = document.getElementById('maxError');

    const bookGenresSection = document.getElementById('bookGenresSection');
    const genreChips = document.querySelectorAll('.genre-chip');
    const customGenreInput = document.getElementById('customGenre');
    const previewGenres = document.getElementById('previewGenres');
    
    const previewName = document.getElementById('previewName');
    const previewPronouns = document.getElementById('previewPronouns');
    const previewTitle = document.getElementById('previewTitle');
    const previewIcons = document.getElementById('previewIcons');
    const printBtn = document.getElementById('printBtn');
    
    const successOverlay = document.getElementById('successOverlay');
    const errorOverlay = document.getElementById('errorOverlay');
    const errorMsg = document.getElementById('errorMsg');

    let selectedIcons = new Set();
    let selectedPronouns = new Set();
    let selectedGenres = new Set();
    const MAX_ICONS = 3;

    // Initialize Pronouns Chip Selection
    pronounChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const val = chip.dataset.value;
            if (selectedPronouns.has(val)) {
                selectedPronouns.delete(val);
                chip.classList.remove('selected');
            } else {
                selectedPronouns.add(val);
                chip.classList.add('selected');
            }
            updatePreview();
        });
    });

    // Initialize Book Genre Chip Selection
    genreChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const val = chip.dataset.value;
            if (selectedGenres.has(val)) {
                selectedGenres.delete(val);
                chip.classList.remove('selected');
            } else {
                selectedGenres.add(val);
                chip.classList.add('selected');
            }
            updatePreview();
        });
    });

    // Helper to get formatted combined pronouns
    function getCombinedPronouns() {
        const chipList = Array.from(selectedPronouns);
        const customText = customPronounsInput ? customPronounsInput.value.trim() : '';
        if (customText) {
            chipList.push(customText);
        }
        return chipList.join(', ');
    }

    // Helper to get formatted combined book genres
    function getCombinedGenres() {
        const chipList = Array.from(selectedGenres);
        const customText = customGenreInput ? customGenreInput.value.trim() : '';
        if (customText) {
            chipList.push(customText);
        }
        return chipList.length > 0 ? `Books: ${chipList.join(', ')}` : '';
    }

    // Helper for robust icon path resolution across localhost & GitHub Pages (handles missing trailing slashes)
    function getIconUrl(id) {
        let basePath = window.location.pathname;
        if (!basePath.endsWith('/')) {
            if (basePath.includes('.')) {
                basePath = basePath.substring(0, basePath.lastIndexOf('/') + 1);
            } else {
                basePath += '/';
            }
        }
        const ext = (id === 'cooking' || id === 'travel') ? 'png' : 'svg';
        return `${basePath}icons/${id}.${ext}`;
    }

    // Initialize Icon Grid
    function initGrid() {
        iconGrid.innerHTML = '';
        ICON_CATEGORIES.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = 'icon-btn';
            btn.dataset.id = cat.id;
            
            const imgSrc = getIconUrl(cat.id);
            btn.innerHTML = `
                <div class="icon-circle">
                    <img src="${imgSrc}" alt="${cat.label}" onerror="this.outerHTML='${cat.emoji}'">
                </div>
                <span class="icon-label">${cat.label}</span>
            `;
            
            btn.addEventListener('click', () => toggleIcon(cat.id, btn));
            iconGrid.appendChild(btn);
        });
    }

    // Toggle Icon Selection
    function toggleIcon(id, btnElement) {
        if (selectedIcons.has(id)) {
            selectedIcons.delete(id);
            btnElement.classList.remove('selected');
        } else {
            if (selectedIcons.size >= MAX_ICONS) {
                btnElement.classList.add('shake');
                maxError.style.opacity = '1';
                
                setTimeout(() => {
                    btnElement.classList.remove('shake');
                    maxError.style.opacity = '0';
                }, 400);
                return;
            }
            selectedIcons.add(id);
            btnElement.classList.add('selected');
        }

        // Show or hide book genres sub-selection if Books icon is toggled
        if (bookGenresSection) {
            if (selectedIcons.has('books')) {
                bookGenresSection.classList.remove('hidden');
            } else {
                bookGenresSection.classList.add('hidden');
            }
        }
        
        updateGridState();
        updatePreview();
    }

    // Update Grid Dimming
    function updateGridState() {
        if (selectedIcons.size >= MAX_ICONS) {
            iconGrid.classList.add('max-reached');
        } else {
            iconGrid.classList.remove('max-reached');
        }
    }

    // Update Live Badge Preview
    function updatePreview() {
        const name = firstNameInput.value.trim();
        const pronouns = getCombinedPronouns();
        const title = titleInput.value.trim();
        const genres = selectedIcons.has('books') ? getCombinedGenres() : '';

        previewName.textContent = name || '';
        previewPronouns.textContent = pronouns;
        previewTitle.textContent = title;
        if (previewGenres) {
            previewGenres.textContent = genres;
        }

        // Auto-scale font for long names
        if (name.length > 7) {
            previewName.style.fontSize = Math.max(1.3, 2.5 - (name.length - 7) * 0.12) + 'rem';
        } else {
            previewName.style.fontSize = '2.5rem';
        }

        // Update preview icons
        previewIcons.innerHTML = '';
        Array.from(selectedIcons).forEach(id => {
            const cat = ICON_CATEGORIES.find(c => c.id === id);
            if (cat) {
                const iconItem = document.createElement('div');
                iconItem.className = 'badge-icon-item';
                const imgSrc = getIconUrl(id);
                iconItem.innerHTML = `<img src="${imgSrc}" alt="${cat.label}">`;
                previewIcons.appendChild(iconItem);
            }
        });

        // Enable/disable print button
        printBtn.disabled = name.length === 0;
    }

    // Input listeners
    firstNameInput.addEventListener('input', updatePreview);
    titleInput.addEventListener('input', updatePreview);
    if (customPronounsInput) {
        customPronounsInput.addEventListener('input', updatePreview);
    }
    if (customGenreInput) {
        customGenreInput.addEventListener('input', updatePreview);
    }

    // Enter key to print
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !printBtn.disabled) {
            if (successOverlay.classList.contains('hidden') && errorOverlay.classList.contains('hidden')) {
                printBadge();
            }
        }
    });

    // Print button
    printBtn.addEventListener('click', printBadge);

    const PRINT_BTN_DEFAULT = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
        Print Badge
    `;

    async function printBadge() {
        const name = firstNameInput.value.trim();
        const pronouns = getCombinedPronouns();
        const title = titleInput.value.trim();
        const genres = selectedIcons.has('books') ? getCombinedGenres() : '';
        const icons = Array.from(selectedIcons);

        if (!name) return;

        printBtn.disabled = true;
        printBtn.innerHTML = '<span class="loading">Printing...</span>';

        try {
            // Build icon URLs for selected icons
            const iconUrls = icons.map(id => getIconUrl(id));

            // Render the entire badge as a bitmap and convert to ZPL
            const zpl = await renderBadgeToZPL({ name, pronouns, title, genres, iconUrls });

            // Determine print endpoint (relative path for local LAN & localhost, fallback for static hosting)
            const printApiUrl = window.location.hostname.includes('github.io')
                ? 'http://localhost:3000/api/print'
                : '/api/print';

            // Send pre-rendered ZPL to server
            const response = await fetch(printApiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ zpl })
            });
            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Failed to print');
            }

            // Show success
            successOverlay.classList.remove('hidden');
            
            // Auto reset after 4 seconds
            setTimeout(() => {
                resetForm();
                successOverlay.classList.add('hidden');
            }, 4000);

        } catch (error) {
            console.error(error);
            errorMsg.textContent = error.message || 'Something went wrong. Please try again.';
            errorOverlay.classList.remove('hidden');
            
            setTimeout(() => {
                errorOverlay.classList.add('hidden');
            }, 3000);
        } finally {
            printBtn.innerHTML = PRINT_BTN_DEFAULT;
            updatePreview();
        }
    }

    function resetForm() {
        firstNameInput.value = '';
        titleInput.value = '';
        if (customPronounsInput) customPronounsInput.value = '';
        selectedPronouns.clear();
        selectedIcons.clear();
        
        pronounChips.forEach(chip => chip.classList.remove('selected'));
        document.querySelectorAll('.icon-btn').forEach(btn => {
            btn.classList.remove('selected', 'shake');
        });
        
        updateGridState();
        updatePreview();
        firstNameInput.focus();
    }

    // Init
    initGrid();
    updatePreview();
    firstNameInput.focus();
});
