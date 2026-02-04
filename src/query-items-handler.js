// Global variable to store pending delivery items
let pendingDeliveryItems = null;

// Check for delivery items on page load
document.addEventListener('DOMContentLoaded', function() {
    checkForDeliveryItems();
});

function checkForDeliveryItems() {
    const urlParams = new URLSearchParams(window.location.search);
    const itemsParam = urlParams.get('items');
    
    if (itemsParam) {
        try {
            const deliveryItems = JSON.parse(decodeURIComponent(itemsParam));
            
            if (Array.isArray(deliveryItems) && deliveryItems.length > 0) {
                // Clean URL first
                const newUrl = window.location.pathname;
                window.history.replaceState({}, document.title, newUrl);
                
                // save the params
                window.deliveryParams = itemsParam;
                
                // Always store as pending items - will be processed after successful API response
                pendingDeliveryItems = deliveryItems;
            }
        } catch (error) {
            console.error('Error parsing delivery items:', error);
        }
    }
}

// Function to check and process pending delivery items after successful data load
function processPendingDeliveryItems() {
    if (pendingDeliveryItems && inventoryData && inventoryData.length > 0) {
        // Small delay to ensure UI is fully rendered
        setTimeout(() => {
            showDeliveryItemsDialog(pendingDeliveryItems);
            pendingDeliveryItems = null; // Clear after processing
        }, 500);
    }
}

function showDeliveryItemsDialog(deliveryItems) {
    // Enrich delivery items with names and collections from inventory data
    const enrichedItems = deliveryItems.map(deliveryItem => {
        const itemInfo = findItemInfoById(deliveryItem.id);
        return {
            id: deliveryItem.id,
            qty: deliveryItem.qty,
            name: itemInfo ? itemInfo.name : `Unknown Item (ID: ${deliveryItem.id})`,
            collection: itemInfo ? itemInfo.collection : 'Unknown Collection',
            found: !!itemInfo
        };
    });
    
    // Create modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'delivery-items-modal-overlay';
    modalOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;
    
    const modal = document.createElement('div');
    modal.className = 'delivery-items-modal';
    modal.style.cssText = `
        background: white;
        border-radius: 8px;
        padding: 20px;
        max-width: 600px;
        max-height: 80vh;
        overflow-y: auto;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    `;
    
    const foundItems = enrichedItems.filter(item => item.found);
    const notFoundItems = enrichedItems.filter(item => !item.found);
    
    modal.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h3 style="margin: 0; color: #333;">Delivery Items</h3>
            <button id="closeDeliveryModal" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">&times;</button>
        </div>
        <div style="margin-bottom: 20px;">
            <div style="color: #666; margin-bottom: 10px;">
                Found ${enrichedItems.length} items from delivery.
                ${foundItems.length > 0 ? `<span style="color: #4CAF50;">✅ ${foundItems.length} available in inventory</span>` : ''}
                ${notFoundItems.length > 0 ? `<span style="color: #ff9800;"> ⚠️ ${notFoundItems.length} not found in inventory</span>` : ''}
            </div>
        </div>
        
        ${foundItems.length > 0 ? `
            <div style="margin-bottom: 20px;">
                <h4 style="color: #4CAF50; margin: 0 0 10px 0;">Available Items:</h4>
                <div id="availableItemsList">
                    ${foundItems.map((item, index) => `
                        <div style="display: flex; align-items: center; padding: 12px; border: 1px solid #4CAF50; margin-bottom: 8px; border-radius: 4px; background: #f8fff8;">
                            <input type="checkbox" id="availableItem_${index}" checked style="margin-right: 12px;">
                            <div style="flex: 1;">
                                <div style="font-weight: bold; color: #333;">${escapeHtml(item.name)}</div>
                                <div style="font-size: 12px; color: #666; margin-top: 2px;">[${escapeHtml(item.collection)}] • Qty: ${item.qty} • ID: ${item.id}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}
        
        ${notFoundItems.length > 0 ? `
            <div style="margin-bottom: 20px;">
                <h4 style="color: #ff9800; margin: 0 0 10px 0;">Not Found in Inventory:</h4>
                <div id="notFoundItemsList">
                    ${notFoundItems.map(item => `
                        <div style="padding: 12px; border: 1px solid #ff9800; margin-bottom: 8px; border-radius: 4px; background: #fff8f0;">
                            <div style="font-weight: bold; color: #333;">${escapeHtml(item.name)}</div>
                            <div style="font-size: 12px; color: #666; margin-top: 2px;">Qty: ${item.qty} • ID: ${item.id}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}
        
        <div style="display: flex; gap: 10px; justify-content: flex-end;">
            <button id="cancelDeliveryItems" style="padding: 10px 20px; background: #f0f0f0; border: 1px solid #ccc; border-radius: 4px; cursor: pointer;">Cancel</button>
            ${foundItems.length > 0 ? `<button id="addDeliveryItems" style="padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">Add Selected Items</button>` : ''}
        </div>
        <div id="deliveryItemsStatus" style="margin-top: 15px; padding: 10px; border-radius: 4px; display: none;"></div>
    `;
    
    modalOverlay.appendChild(modal);
    document.body.appendChild(modalOverlay);
    
    // Event listeners
    document.getElementById('closeDeliveryModal').addEventListener('click', () => {
        modalOverlay.remove();
    });
    
    document.getElementById('cancelDeliveryItems').addEventListener('click', () => {
        modalOverlay.remove();
    });
    
    if (foundItems.length > 0) {
        document.getElementById('addDeliveryItems').addEventListener('click', () => {
            processDeliveryItems(foundItems, modalOverlay);
        });
    }
    
    // Close on overlay click
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            modalOverlay.remove();
        }
    });
}

function findItemInfoById(itemId) {
    // Search through all collections and items to find matching ID
    for (const collection of inventoryData) {
        for (const item of collection.items) {
            if (item.id.toString() === itemId.toString()) {
                return {
                    name: item.item,
                    collection: collection.collection,
                    item: item
                };
            }
        }
    }
    return null;
}

function processDeliveryItems(foundItems, modalOverlay) {
    // Wait for authentication and inventory data to be loaded
    
    if (!inventoryData || inventoryData.length === 0) {
        showDeliveryStatus('Inventory data not loaded. Please refresh data first.', 'error');
        return;
    }
    
    const selectedItems = [];
    foundItems.forEach((item, index) => {
        const checkbox = document.getElementById(`availableItem_${index}`);
        if (checkbox && checkbox.checked) {
            selectedItems.push(item);
        }
    });
    
    if (selectedItems.length === 0) {
        showDeliveryStatus('Please select at least one item', 'error');
        return;
    }
    
    showDeliveryStatus('Processing items...', 'info');
    
    let addedCount = 0;
    
    selectedItems.forEach(deliveryItem => {
        const success = findAndAddItemById(deliveryItem.id, deliveryItem.qty);
        if (success) {
            addedCount++;
        }
    });
    
    // Show results
    let message = `✅ Successfully added ${addedCount} items to your list`;
    
    showDeliveryStatus(message, 'success');
    
    if (addedCount > 0) {
        renderSelectedItems(); // Refresh the selected items display
        
        // Close modal after delay
        setTimeout(() => {
            modalOverlay.remove();
        }, 500);
    }
}

function findAndAddItemById(itemId, quantity) {
    // Search through all collections and items to find matching ID
    for (const collection of inventoryData) {
        for (const item of collection.items) {
            if (item.id.toString() === itemId.toString()) {
                // Found matching item, add it to selected items
                const itemKey = `${collection.collection}|||${item.item}`;
                const safeItemKey = btoa(itemKey);
                
                const currentQty = selectedItems.get(safeItemKey) || 0;
                const newQty = currentQty + quantity;
                selectedItems.set(safeItemKey, newQty);
                
                // Update badge
                updateSingleBadge(safeItemKey, newQty);
                
                return true;
            }
        }
    }
    
    return false;
}

function showDeliveryStatus(message, type) {
    const statusDiv = document.getElementById('deliveryItemsStatus');
    if (!statusDiv) return;
    
    const colors = {
        success: '#d4edda',
        error: '#f8d7da',
        info: '#d1ecf1'
    };
    
    const textColors = {
        success: '#155724',
        error: '#721c24',
        info: '#0c5460'
    };
    
    statusDiv.style.display = 'block';
    statusDiv.style.backgroundColor = colors[type] || colors.info;
    statusDiv.style.color = textColors[type] || textColors.info;
    statusDiv.style.border = `1px solid ${colors[type] || colors.info}`;
    statusDiv.innerHTML = message.replace(/\n/g, '<br>');
}