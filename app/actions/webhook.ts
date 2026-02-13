'use server';

const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://n8n.startglobal.org/webhook/4576bef6-c2b0-4560-852e-93e9cf7d72ae';

export async function notifyLowStock(itemData: {
    id: string;
    name: string;
    sku: string;
    category: string;
    stock: number;
    minThreshold: number;
}) {
    try {
        console.log(`Sending low stock notification for ${itemData.name}`);

        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                item_id: itemData.id,
                item_name: itemData.name,
                sku: itemData.sku,
                category: itemData.category,
                current_stock: itemData.stock,
                min_threshold: itemData.minThreshold,
                timestamp: new Date().toISOString(),
                alert_type: 'low_stock',
                message: `${itemData.name} is running low! Current stock: ${itemData.stock}, Minimum threshold: ${itemData.minThreshold}`
            }),
        });

        if (!response.ok) {
            console.error('Webhook notification failed:', response.statusText);
            return { success: false, error: response.statusText };
        }

        console.log(`Low stock notification sent successfully for ${itemData.name}`);
        return { success: true };
    } catch (error) {
        console.error('Error sending webhook notification:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
}
