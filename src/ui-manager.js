// Global variables for UI
let selectedItems = new Map(); // Using Map to store quantities
let currentRemoveItem = null;

// Resize functionality
let isResizing = false;
let startX = 0;
let startLeftWidth = 0;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Initialize resize functionality
    initializeResize();
    
    // Initialize title input
    initializeTitleInput();
    
    // Focus password input
    setTimeout(() => {
        const passwordInput = document.getElementById('passwordInput');
        if (passwordInput) {
            passwordInput.focus();
        }
    }, 100);
});

function initializeResize() {
    const resizeHandle = document.getElementById('resizeHandle');
    const container = document.querySelector('.container');
    const leftPanel = document.getElementById('leftPanel');
    const rightPanel = document.getElementById('rightPanel');

    resizeHandle.addEventListener('mousedown', function(e) {
        isResizing = true;
        startX = e.clientX;
        startLeftWidth = leftPanel.offsetWidth;
        
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        
        e.preventDefault();
    });

    document.addEventListener('mousemove', function(e) {
        if (!isResizing) return;
        
        const deltaX = e.clientX - startX;
        const containerWidth = container.offsetWidth - 8; // Subtract resize handle width
        const newLeftWidth = startLeftWidth + deltaX;
        
        // Set minimum widths (25% of container)
        const minWidth = containerWidth * 0.25;
        const maxWidth = containerWidth * 0.75;
        
        if (newLeftWidth >= minWidth && newLeftWidth <= maxWidth) {
            const leftPercent = (newLeftWidth / containerWidth) * 100;
            const rightPercent = 100 - leftPercent;
            
            leftPanel.style.width = leftPercent + '%';
            rightPanel.style.width = rightPercent + '%';
        }
    });

    document.addEventListener('mouseup', function() {
        if (isResizing) {
            isResizing = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }
    });
}

function initializeTitleInput() {
    const titleInput = document.getElementById('printTitleInput');
    const printTitle = document.querySelector('.print-title');
    
    // Set default value
    titleInput.value = 'ITEM LIST';
    
    // Update print title when input changes
    titleInput.addEventListener('input', function() {
        const value = this.value.trim() || 'ITEM LIST';
        printTitle.textContent = value;
    });
    
    // Initialize print title
    printTitle.textContent = 'ITEM LIST';
}

function toggleCollection(collectionId) {
    const content = document.getElementById(`content-${collectionId}`);
    const icon = document.getElementById(`icon-${collectionId}`);
    
    if (content.classList.contains('open')) {
        content.classList.remove('open');
        icon.classList.remove('rotated');
    } else {
        content.classList.add('open');
        icon.classList.add('rotated');
    }
}

function updateQuantityInputVisibility() {
    document.querySelectorAll('.qty-input').forEach(input => {
        const value = parseInt(input.value) || 1;
        if (value > 1) {
            input.classList.add('has-quantity');
        } else {
            input.classList.remove('has-quantity');
        }
    });
}

function focusQuantityInput(safeItemKey) {
    const input = document.querySelector(`input[data-item="${safeItemKey}"]`);
    if (input) {
        input.focus();
        input.select();
    }
}

// Remove popup functions
function showRemovePopup(safeItemKey) {
    currentRemoveItem = safeItemKey;
    const currentQty = selectedItems.get(safeItemKey) || 1;
    
    const removeInput = document.getElementById('removeQtyInput');
    removeInput.value = 1;
    removeInput.max = currentQty;
    
    const overlay = document.getElementById('removePopupOverlay');
    overlay.classList.add('show');
    
    // Wait for CSS transition to complete
    setTimeout(() => {
        removeInput.focus();
        removeInput.select();
    }, 250);
}

function hideRemovePopup(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById('removePopupOverlay').classList.remove('show');
    currentRemoveItem = null;
}

function confirmRemove() {
    if (!currentRemoveItem) return;
    
    const removeQty = parseInt(document.getElementById('removeQtyInput').value) || 1;
    const currentQty = selectedItems.get(currentRemoveItem) || 1;
    
    let newQty;
    
    if (removeQty >= currentQty) {
        selectedItems.delete(currentRemoveItem);
        newQty = 0;
    } else {
        newQty = currentQty - removeQty;
        selectedItems.set(currentRemoveItem, newQty);
    }
    
    renderSelectedItems();
    updateSingleBadge(currentRemoveItem, newQty);
    hideRemovePopup();
}

function handleRemoveInputKeydown(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        confirmRemove();
    } else if (event.key === 'Escape') {
        event.preventDefault();
        hideRemovePopup();
    }
}

function toggleControlsMenu() {
    const controlsMenu = document.getElementById('controlsMenu');
    
    if (controlsMenu.classList.contains('hidden')) {
        controlsMenu.classList.remove('hidden');
    } else {
        controlsMenu.classList.add('hidden');
    }
}

// Add this to the DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', function() {
    // ... existing code ...
    
    // Hide controls menu by default
    setTimeout(() => {
        const controlsMenu = document.getElementById('controlsMenu');
        if (controlsMenu) {
            controlsMenu.classList.add('hidden');
        }
    }, 100);
});