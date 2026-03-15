# Restrict Ordering to Units Prompt for Claude Code

@claude-code Please update the START Inventory Management System to restrict coffee points / volunteers from ordering individual items when a unit size (e.g., case) is defined. The goal is to focus on unit-based ordering rather than raw item counts for bulk items.

Please implement this by modifying the follow components:

## 1. Volunteer Request UI (`app/request/[slug]/VolunteerRequestForm.tsx`)
- Currently, when an item has `quantityPerUnit > 1` (i.e., `hasCase`), the UI shows three buttons: "+1 [Unit]", "+1 item", and "Custom".
- **Remove** the "+1 item" and "Custom" buttons if the item has a defined unit size (`hasCase` is true). 
- If the item does **not** have a unit size (`quantityPerUnit` is 1 or null), keep the "+1 item" and "Custom" buttons.
- Ensure the quantity displayed to the user strictly reflects **units**, not raw item counts, if a unit is defined. Right now, `quantities` state tracks raw items. Consider converting the display so if a user clicks "+1 case" (which adds 24 items to the state), the UI badge says "1 case" instead of "24". Or update the state to track units and multiply by `quantityPerUnit` only upon submission. 

## 2. Order Review / Cart Summary
- In the `VolunteerRequestForm` review modal, and everywhere quantities are displayed back to the volunteer, show the human-readable unit count.
  - Example: If they order 48 items of a product that has 24 items per case, show "2 cases" instead of "48 items".
  - If no unit size is defined, show "x48 items" as normal.

## 3. Coordinator Fulfillment UI (`app/orders/page.tsx` or similar)
- When coordinators look at incoming volunteer requests, they should clearly see the request in terms of units. 
- Example: "2 cases (48 items)" instead of just "48 items", to make it easier for them to grab the physical boxes from the warehouse.

*Note: Ensure you handle the math correctly. If you modify how `quantities` state works in `VolunteerRequestForm.tsx`, be sure that the `submitVolunteerRequest` action still receives the correct underlying integer count of individual items, as the database tracks raw stock!*
