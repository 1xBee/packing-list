// Alphabet navigation functionality
let currentLetter = null;
let currentLetterIndex = 0;
let collectionsForCurrentLetter = [];

// Initialize alphabet navigation when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    setupKeyboardListener();
    setupClickOutsideListener();
});

// Setup keyboard event listener
function setupKeyboardListener() {
    document.addEventListener('keydown', function(event) {
        // Make sure to not fire on input typing
        if(event.target.tagName === 'INPUT') return;
        
        // Check if no control key is pressed
        if(event.ctrlKey || event.altKey || event.metaKey) return;
        
        // Check if pressed key is a letter A-Z
        const key = event.key.toUpperCase();
        if (key.match(/^[A-Z]{1}$/)) {
            handleLetterPress(key, event.shiftKey);
        }
    });
}

// Handle letter key press
function handleLetterPress(letter, shift = false) {
    
    // If same letter pressed, go to next occurrence
    if (currentLetter === letter) {
        !shift ? currentLetterIndex++ : currentLetterIndex--;
        if (currentLetterIndex >= collectionsForCurrentLetter.length) {
            currentLetterIndex = 0; // Cycle back to first
        }else if (currentLetterIndex < 0) {// to last
            currentLetterIndex = collectionsForCurrentLetter.length -1;
        }
    } else {
        // New letter pressed
        currentLetter = letter;
        findCollectionsStartingWith(letter);
        currentLetterIndex = 0; // Always reset the index
        if (collectionsForCurrentLetter.length > 0) {
            currentLetterIndex = !shift ? 0 : collectionsForCurrentLetter.length -1;
        }
    }
    
    // Navigate to the collection
    if (collectionsForCurrentLetter.length > 0) {
        const targetCollection = collectionsForCurrentLetter[currentLetterIndex];
        scrollToAndHighlightCollection(targetCollection);
    }
}

// Find all collections starting with the given letter
function findCollectionsStartingWith(letter) {
    collectionsForCurrentLetter = [];
    
    const collections = document.querySelectorAll('.collection');
    collections.forEach(collection => {
        const collectionHeader = collection.querySelector('.collection-header span');
        if (collectionHeader) {
            const collectionName = collectionHeader.textContent.trim();
            if (collectionName.toUpperCase().startsWith(letter.toUpperCase())) {
                collectionsForCurrentLetter.push(collection);
            }
        }
    });
}

// Scroll to and highlight the target collection
function scrollToAndHighlightCollection(collectionElement) {
    // Remove active class from all collections
    removeActiveFromAllCollections();
    
    // Add active class to target collection
    collectionElement.classList.add('active');
    
    const leftPanel = document.getElementById('leftPanel');
    const panelHeight = leftPanel.clientHeight;
    const currentScrollTop = leftPanel.scrollTop;
    
    // Get collection position relative to panel
    const collectionTop = collectionElement.offsetTop;
    const collectionHeight = collectionElement.offsetHeight;
    const collectionBottom = collectionTop + collectionHeight;
    
    // Define margin zone only at bottom (20% of panel height from bottom)
    const marginSize = panelHeight * 0.2;
    const visibleTop = currentScrollTop;
    const visibleBottom = currentScrollTop + panelHeight - marginSize;
    
    // Check if collection is within the visible area (no top margin, only bottom margin)
    const isWithinMargins = collectionTop >= visibleTop && collectionBottom <= visibleBottom;
    
    // Only scroll if collection is outside the margin zones
    if (!isWithinMargins) {
        // Calculate scroll position to center the collection
        const scrollTop = collectionTop - (panelHeight / 2) + (collectionHeight / 2);
        
        leftPanel.scrollTo({
            top: scrollTop,
            behavior: 'smooth'
        });
    }
}

// Remove active class from all collections
function removeActiveFromAllCollections() {
    const collections = document.querySelectorAll('.collection');
    collections.forEach(collection => {
        collection.classList.remove('active');
    });
}

// Setup click outside listener to remove active state
function setupClickOutsideListener() {
    document.addEventListener('click', function(event) {
        const isInsideCollection = event.target.closest('.collection.active');
        
        // If click is not inside active collection
        if (!isInsideCollection) {
            removeActiveFromAllCollections();
            currentLetter = null;
            currentLetterIndex = 0;
            collectionsForCurrentLetter = [];
        }
    });
}
