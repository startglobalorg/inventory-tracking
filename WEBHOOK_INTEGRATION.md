# Webhook Integration - Low Stock Alerts

This document explains how the low stock alert webhook integration works.

## Overview

The system automatically sends notifications to Slack (via n8n webhook) when inventory items drop to or below their minimum threshold.

## Webhook URL

```
POST https://n8n.startglobal.org/webhook/4576bef6-c2b0-4560-852e-93e9cf7d72ae
```

## How It Works

1. **Trigger Condition**: When a user submits a consumption order (takes items from inventory)
2. **Stock Check**: After updating the item's stock, the system checks:
   - Was the item **above** the minimum threshold before?
   - Is the item **at or below** the minimum threshold now?
3. **Notification**: If both conditions are met, a webhook notification is sent to Slack

## Payload Structure

The webhook receives a JSON payload with the following structure:

```json
{
  "item_id": "uuid-of-item",
  "item_name": "Coca-Cola (500ml)",
  "sku": "DRINK-COKE-500",
  "category": "Soft Drinks",
  "current_stock": 8,
  "min_threshold": 10,
  "timestamp": "2026-01-29T10:30:00.000Z",
  "alert_type": "low_stock",
  "message": "Coca-Cola (500ml) is running low! Current stock: 8, Minimum threshold: 10"
}
```

## Implementation Details

### Files Modified

- **`app/actions/webhook.ts`**: Contains the `notifyLowStock()` function that sends webhook notifications
- **`app/actions/order.ts`**: Updated to check stock levels and trigger notifications after order submission

### Key Logic

```javascript
// Check if item crossed the threshold
const wasAboveThreshold = currentItem.stock > currentItem.minThreshold;
const isNowAtOrBelowThreshold = newStock <= currentItem.minThreshold;

// Only notify when consuming items (not restocking)
if (changeAmount < 0 && wasAboveThreshold && isNowAtOrBelowThreshold) {
    // Send notification
    notifyLowStock({ ... });
}
```

### Important Notes

- Notifications are **fire-and-forget** (non-blocking)
- If the webhook fails, the order still completes successfully
- Notifications only trigger when crossing the threshold (not every time an item is already low)
- Only consumption orders trigger notifications (restocking does not)

## Testing

To test the webhook integration:

1. **Set a low threshold** for an item:
   ```bash
   # Using Drizzle Studio
   npm run db:studio

   # Or using sqlite3
   sqlite3 sqlite-data/sqlite.db
   UPDATE items SET min_threshold = 50 WHERE name LIKE 'Coca-Cola%';
   ```

2. **Consume items** to drop below the threshold:
   - Go to the main inventory page
   - Take enough items to cross below the threshold
   - Submit the order

3. **Check your Slack channel** for the notification

4. **View logs** to verify webhook was sent:
   ```bash
   docker-compose -f docker-compose.prod.yml logs -f

   # You should see:
   # "Sending low stock notification for [Item Name]"
   # "Low stock notification sent successfully for [Item Name]"
   ```

## Troubleshooting

### Webhook Not Triggering

Check if:
- Item was already below threshold before the order
- The order was a restock (webhooks only trigger on consumption)
- The webhook URL is correct and accessible
- Check server logs for error messages

### View Webhook Logs

```bash
# On Hetzner server
docker-compose -f docker-compose.prod.yml logs | grep "low stock"
```

### Manual Testing

You can manually trigger a test notification by calling the function directly in a test script:

```javascript
import { notifyLowStock } from '@/app/actions/webhook';

await notifyLowStock({
    id: 'test-id',
    name: 'Test Item',
    sku: 'TEST-001',
    category: 'Testing',
    stock: 5,
    minThreshold: 10,
});
```

## n8n Workflow Configuration

On the n8n side, you should configure the workflow to:

1. **Receive webhook** data from this application
2. **Format message** for Slack (e.g., "⚠️ Low Stock Alert: Coca-Cola is running low (8/10)")
3. **Send to Slack** channel using Slack node
4. **(Optional)** Store in database for reporting
5. **(Optional)** Send email to admins

### Example Slack Message Format

```
⚠️ LOW STOCK ALERT

Item: Coca-Cola (500ml)
SKU: DRINK-COKE-500
Category: Soft Drinks

Current Stock: 8
Minimum Threshold: 10

Action Required: Please restock this item soon!
Timestamp: 2026-01-29 10:30:00
```

## Configuration

To change the webhook URL, edit `app/actions/webhook.ts`:

```javascript
const WEBHOOK_URL = 'https://your-new-webhook-url.com/webhook';
```

After changing, rebuild and redeploy:

```bash
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

## Future Enhancements

Possible improvements to consider:

1. **Configurable webhook URL** via environment variable
2. **Multiple notification channels** (Slack, Email, SMS)
3. **Batch notifications** (send once per order with all low items)
4. **Threshold levels** (warning at 20%, critical at 10%)
5. **Admin dashboard** to view notification history
6. **Retry mechanism** for failed webhooks
