// Global variables
let inventoryData = [];
let authPassword = null;
let lastRequestStatus = null; // null = no previous request, 200 = success, 401 = auth failed, other = error

// Left panel status management
function updateLeftPanelStatus(status, message = '') {
    const statusElement = document.getElementById('leftPanelStatus');
    const container = document.getElementById('collections-container');
    
    switch (status) {
        case 'loading':
            container.innerHTML = `
                <div class="no-data" id="leftPanelStatus">
                    <div class="loading-spinner"></div>
                    <span>Loading inventory data...</span>
                </div>
            `;
            break;
        case 'auth-required':
            container.innerHTML = `
                <div class="no-data" id="leftPanelStatus">
                    <span>Authentication required to view inventory</span>
                </div>
            `;
            break;
        case 'auth-failed':
            container.innerHTML = `
                <div class="no-data" id="leftPanelStatus">
                    <span>Authentication failed. Please try again.</span>
                </div>
            `;
            break;
        case 'network-error':
            container.innerHTML = `
                <div class="no-data" id="leftPanelStatus">
                    <span>Connection error. Please check your network.</span>
                </div>
            `;
            break;
        case 'no-data':
            container.innerHTML = `
                <div class="no-data" id="leftPanelStatus">
                    <span>No inventory data available</span>
                </div>
            `;
            break;
    }
}
// Single API caller function
async function makeAPICall(options = {}) {
    const {ignoreItemsPram, showLoading} = options;

    if (showLoading) {
        showAuthLoading(true);
    }
    
    try {
        // Build headers
        const headers = {
            'Content-Type': 'application/json'
        };
        
        // Add auth if we have password
        if (authPassword) {
            const encodedPassword = btoa(authPassword);
            headers['Authorization'] = `Basic ${encodedPassword}`;
        }
        
        // Build URL with delivery params if available
        let url = '/api/data';
        if (window.deliveryParams && !ignoreItemsPram) {
            url += `?items=${encodeURIComponent(window.deliveryParams)}`;
        }
        
        const response = await fetch(url, {
            method: 'GET',
            headers: headers
        });
        
        lastRequestStatus = response.status;
        
        if (response.status === 200) {
            const data = await response.json();
            // Only update inventory data on success - preserve selected items
            inventoryData = data;
            
            // Hide auth modal if it's showing
            if (document.getElementById('authModal').style.display === 'flex') {
                hideAuthModal();
            }
            
            renderCollections();

            // Process pending delivery items after successful data load
            processPendingDeliveryItems();

            return true; // Success
            
        } else if (response.status === 401) {
            // Authentication required or failed
            handleAuthRequired();
            return false; // Auth needed
            
        } else {
            // Other error
            handleAPIError(response.status);
            return false; // Error
        }
        
    } catch (error) {
        console.error('API Error:', error);
        handleNetworkError();
        return false; // Network error
        
    } finally {
        if (showLoading) {
            showAuthLoading(false);
        }
    }
}

// Handle authentication required
function handleAuthRequired() {
    const authModal = document.getElementById('authModal');
    
    if (authPassword) {
        // Password was provided but failed
        showAuthError('Invalid password. Please try again.');
        document.getElementById('passwordInput').value = '';
        document.getElementById('passwordInput').focus();
    } else {
        // No password provided, show modal
        if (authModal.style.display !== 'flex') {
            authModal.classList.remove('fade-out');
            authModal.style.display = 'flex';
            setTimeout(() => {
                document.getElementById('passwordInput').focus();
            }, 100);
        }
    }
}

// Handle API errors (non-auth)
function handleAPIError(status) {
    if (lastRequestStatus === null) {
        // First request failed with non-auth error - show modal with error
        const authModal = document.getElementById('authModal');
        if (authModal.style.display !== 'flex') {
            authModal.classList.remove('fade-out');
            authModal.style.display = 'flex';
        }
        showAuthError(`Error loading data: Server returned ${status}`);
    } else {
        // Refresh failed - show alert but don't clear data
        alert(`Error refreshing data: Server returned ${status}`);
    }
}

// Handle network errors
function handleNetworkError() {
    if (lastRequestStatus === null) {
        // First request failed with network error - show modal with error
        const authModal = document.getElementById('authModal');
        if (authModal.style.display !== 'flex') {
            authModal.classList.remove('fade-out');
            authModal.style.display = 'flex';
        }
        showAuthError('Connection error. Please check your network and try again.');
    } else {
        // Refresh failed - show alert but don't clear data
        alert('Connection error. Please check your network and try again.');
    }
}

// Load data (called on page load)
async function loadData() {
    await makeAPICall();
}

// Refresh data (called by refresh button)
async function refreshData() {
    // Check if we need to show auth modal based on last request
    if (lastRequestStatus === 401 && !authPassword) {
        // Last request failed due to auth and we don't have password
        const authModal = document.getElementById('authModal');
        authModal.classList.remove('fade-out');
        authModal.style.display = 'flex';
        setTimeout(() => {
            document.getElementById('passwordInput').focus();
        }, 100);
        return;
    }
    
    // Show loading state on refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    const refreshText = refreshBtn.querySelector('span');
    const originalText = refreshText.textContent;

    refreshText.textContent = 'Loading...';
    refreshBtn.disabled = true;
    
    try {
        await makeAPICall({ignoreItemsPram: true});
    } finally {
        refreshText.textContent = originalText;
        refreshBtn.disabled = false;
    }
}

// Authentication functions
function submitPassword() {
    const passwordInput = document.getElementById('passwordInput');
    const password = passwordInput.value.trim();
    
    if (!password) {
        showAuthError('Please enter a password');
        return;
    }
    
    authPassword = password;
    makeAPICall({showLoading: true});
}

function handlePasswordKeydown(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        submitPassword();
    }
}

function showAuthError(message) {
    const errorDiv = document.getElementById('authError');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    
    // Clear error after 5 seconds
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

function showAuthLoading(show = true) {
    const loadingDiv = document.getElementById('authLoading');
    const submitBtn = document.querySelector('.auth-submit-btn');
    const passwordInput = document.getElementById('passwordInput');
    
    if (show) {
        loadingDiv.style.display = 'flex';
        submitBtn.disabled = true;
        passwordInput.disabled = true;
    } else {
        loadingDiv.style.display = 'none';
        submitBtn.disabled = false;
        passwordInput.disabled = false;
    }
}

function hideAuthModal() {
    const authModal = document.getElementById('authModal');
    authModal.classList.add('fade-out');
    
    setTimeout(() => {
        authModal.style.display = 'none';
    }, 300);

    // Update left panel status based on authentication state
    if (!authPassword) {
        updateLeftPanelStatus('auth-required');
    }
}

// Badge management
function updateSingleBadge(safeItemKey, quantity) {
    const badgeId = `badge-${safeItemKey}`;
    let badge = document.getElementById(badgeId);
    
    if (quantity > 0) {
        if (!badge) {
            // Create new badge
            const itemElement = document.querySelector(`input[data-item="${safeItemKey}"]`)?.closest('.item');
            if (itemElement) {
                const itemLeft = itemElement.querySelector('.item-left');
                badge = document.createElement('span');
                badge.className = 'badge';
                badge.id = badgeId;
                itemLeft.appendChild(badge);
            }
        }
        if (badge) {
            badge.textContent = quantity;
        }
    } else {
        // Remove badge if quantity is 0
        if (badge) {
            badge.remove();
        }
    }
}

// Data transformation and rendering
function transformDataForRendering() {
    // Transform API JSON data to the format expected by rendering functions
    const transformedData = [];
    
    inventoryData.forEach(collection => {
        collection.items.forEach(item => {
            item.boxes.forEach(box => {
                transformedData.push({
                    collection: collection.collection,
                    item: item.item,
                    id: item.id.toString(),
                    boxCount: box.qty.toString(),
                    boxDescription: box.description
                });
            });
        });
    });
    
    return transformedData;
}

function renderCollections() {
    const container = document.getElementById('collections-container');
    
    if (inventoryData.length === 0) {
        container.innerHTML = '<div class="no-data">No inventory data available</div>';
        return;
    }

    // Transform data and group by collection and item
    const csvData = transformDataForRendering();
    const collections = {};
    
    csvData.forEach(row => {
        if (!collections[row.collection]) {
            collections[row.collection] = {};
        }
        if (!collections[row.collection][row.item]) {
            collections[row.collection][row.item] = [];
        }
        collections[row.collection][row.item].push({
            id: row.id,
            boxCount: row.boxCount,
            boxDescription: row.boxDescription
        });
    });

    // Sort collections alphabetically
    const sortedCollections = Object.keys(collections).sort((a, b) => a.localeCompare(b));

    let html = '';
    sortedCollections.forEach(collectionName => {
        const safeCollectionId = generateSafeId(collectionName);
        
        html += `
            <div class="collection">
                <div class="collection-header" onclick="toggleCollection('${safeCollectionId}')">
                    <span>${escapeHtml(collectionName)}</span>
                    <span class="expand-icon" id="icon-${safeCollectionId}">▶</span>
                </div>
                <div class="collection-content" id="content-${safeCollectionId}">
        `;
        
        // Sort items within collection alphabetically
        const sortedItems = Object.keys(collections[collectionName]).sort((a, b) => a.localeCompare(b));
        
        sortedItems.forEach(itemName => {
            const itemKey = `${collectionName}|||${itemName}`;
            const safeItemKey = btoa(itemKey); // Base64 encode for safety
            const currentQty = selectedItems.get(safeItemKey) || 0;
            
            html += `
                <div class="item" onclick="focusQuantityInput('${safeItemKey}')">
                    <div class="item-left">
                        <span class="item-name">${escapeHtml(itemName)}</span>
                        ${currentQty > 0 ? `<span class="badge" id="badge-${safeItemKey}">${currentQty}</span>` : ''}
                    </div>
                    <div class="item-controls">
                        <input type="number" class="qty-input" value="1" min="1" data-item="${safeItemKey}" onchange="updateQuantityInputVisibility()" onclick="event.stopPropagation()" onkeydown="if(event.key==='Enter'){addItem('${safeItemKey}'); event.preventDefault();}">
                        <button class="add-btn" onclick="addItem('${safeItemKey}'); event.stopPropagation()">Add</button>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
    updateQuantityInputVisibility();
}

function renderSelectedItems() {
    const container = document.getElementById('selected-items-container');
    const removeAllBtn = document.getElementById('removeAllBtn');
    
    if (selectedItems.size === 0) {
        container.innerHTML = '<div class="no-data">Click "Add" buttons to add items here</div>';
        removeAllBtn.style.display = 'none';
        updatePrintButton();
        return;
    }

    removeAllBtn.style.display = 'block';
    updatePrintButton();

    // Transform data for lookup
    const csvData = transformDataForRendering();
    let html = '';
    
    selectedItems.forEach((quantity, safeItemKey) => {
        try {
            const itemKey = atob(safeItemKey); // Decode base64
            const [collectionName, itemName] = itemKey.split('|||');
            
            const itemData = csvData.filter(row => 
                row.collection === collectionName && row.item === itemName
            );

            if (itemData.length > 0) {
                const displayName = itemName;
                const qtyDisplay = quantity > 1 ? ` <span class="qty-display">(Qty: ${quantity})</span>` : '';
                
                html += `
                    <div class="selected-item">
                        <div class="selected-item-header">
                            <span class="selected-item-name">${displayName} [${escapeHtml(collectionName)}]${qtyDisplay}</span>
                            <div class="remove-controls">
                                <button class="remove-btn" onclick="removeItem('${safeItemKey}')">Remove</button>
                                <span class="item-options-symbol" onclick="showRemovePopup('${safeItemKey}')" title="Remove specific quantity">⋮</span>
                            </div>
                        </div>
                        <div class="box-list">
                `;

                itemData.forEach(box => {
                    const multipliedCount = parseInt(box.boxCount) * quantity;
                    html += `
                        <div class="box-row">
                            <div class="box-quantity">Qty: ${multipliedCount}</div>
                            <div class="box-description">${escapeHtml(box.boxDescription)}</div>
                        </div>
                    `;
                });

                html += `
                        </div>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error processing item:', error);
        }
    });

    container.innerHTML = html;
}

// Item management functions
function addItem(safeItemKey) {
    const qtyInput = document.querySelector(`input[data-item="${safeItemKey}"]`);
    const addQty = parseInt(qtyInput ? qtyInput.value : 1) || 1;
    
    const currentQty = selectedItems.get(safeItemKey) || 0;
    const newQty = currentQty + addQty;
    selectedItems.set(safeItemKey, newQty);
    
    // Reset input to 1 if it exists
    if (qtyInput) {
        qtyInput.value = 1;
        updateQuantityInputVisibility();
    }
    
    renderSelectedItems();
    updateSingleBadge(safeItemKey, newQty);
    
    // Scroll to show the newly added item
    setTimeout(() => {
        scrollToNewItem();
    }, 100);
}

function removeItem(safeItemKey) {
    selectedItems.delete(safeItemKey);
    renderSelectedItems();
    updateSingleBadge(safeItemKey, 0);
}

function removeAllItems() {
    if (selectedItems.size === 0) return;
    
    if (confirm('Are you sure you want to remove all selected items?')) {
        // Update all badges to 0 before clearing
        selectedItems.forEach((qty, safeItemKey) => {
            updateSingleBadge(safeItemKey, 0);
        });
        
        selectedItems.clear();
        renderSelectedItems();
    }
}

function scrollToNewItem() {
    const container = document.getElementById('selected-items-container');
    const selectedItemElements = container.querySelectorAll('.selected-item');
    
    if (selectedItemElements.length > 0) {
        const lastItem = selectedItemElements[selectedItemElements.length - 1];
        
        lastItem.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'nearest'
        });
    }
}

// Utility functions
function generateSafeId(str) {
    return 'id_' + btoa(str).replace(/[+/=]/g, '');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Print functionality
function printList() {
    if (selectedItems.size === 0) {
        return;
    }
    
    const titleInput = document.getElementById('printTitleInput');
    const printTitle = document.querySelector('.print-title');
    const titleValue = titleInput.value.trim() || 'ITEM LIST';
    printTitle.textContent = titleValue;
    
    window.print();
}

function updatePrintButton() {
    const printBtn = document.getElementById('printBtn');
    printBtn.disabled = selectedItems.size === 0;
}