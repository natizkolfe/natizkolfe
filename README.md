# Gebeta

Gebeta is an Ethiopian catering and weekly meal-preparation app. Customers build a fasting, non-fasting, or mixed order, customize each dish on its own, and pay before the kitchen confirms anything. Staff run the menu, capacity, and pickup verification from the kitchen board.

The app is a web client that works on a phone or a desktop browser. Payments and text messages are simulated on this server so the whole path can be used without a card processor or an SMS gateway.

## Run it

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:47231](http://127.0.0.1:47231). How to share that server, and how to run a production build, is in [DEPLOYMENT.md](DEPLOYMENT.md).

Orders, accounts, and menu edits are stored in `data/db.json`. That file is created on first launch and is not committed. Delete it to return to the seed menu and an empty order book.

## Two ways to order

**Weekly meals.** Choose 7 or 14 days, with the first meal at least one week out. Place dishes on lunch or dinner. Copy one day across the plan if the week repeats.

**Catering.** Enter a guest count (8 to 80 by default). Portions start from that number: stews follow the headcount, injera starts at two per guest. Preset spreads fill a fasting feast, a doro table, or a mixed mesob. Change any line after that.

The earliest date is checked again when the order is placed and when it is paid. Lead time and daily capacity can be changed in the kitchen.

## Payment and status

An order is saved as **payment pending** until the card succeeds. Pending orders are not cooked and do not hold catering seats.

Demo cards:

- `4242 4242 4242 4242` approves the payment and confirms the order.
- Any number starting with `4000` is declined. The order stays unpaid.
- Other numbers are refused by this demo checkout.

Use any future expiry in `MM/YY` form and any 3-digit security code.

After payment the path is **Confirmed → Preparing → Ready → Picked up or Delivered → Completed**. Staff cannot skip ahead. Pickup and delivery close only when the verification code matches.

The code is created at payment and sent, in this demo, as an in-app text when staff mark the order ready. The customer sees that message and the code on the order. Wire a real SMS provider to the same message body later.

## Kitchen

Open [the staff entrance](http://127.0.0.1:47231/admin). The kitchen password is the server environment variable `ADMIN_PASSWORD`. For local development, set it in `.env.local`, which git ignores. There is no default password. Session tokens are random and stored as hashes.

From the kitchen you can:

- see unpaid orders without moving them into prep
- advance paid orders and record a kitchen note
- edit dish names, descriptions, prices, and availability
- change notice windows, guest capacity, and pickup instructions
- read customer phone numbers and allergy notes

## Accounts

Customers create an account with name, email, phone, and a password of at least 8 characters. Passwords are hashed with scrypt. Dietary defaults are only a starting point; each dish still shows the choices that apply to it.
