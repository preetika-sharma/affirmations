# Affirmations — Product Requirements

## 1. Purpose

A personal app that holds the affirmations I want to come back to in moments of doubt. When doubt hits, I can open it on my phone, pick the kind of doubt I'm feeling, and swipe through bright, uplifting cards that remind me what's true.

## 2. Who it's for

Me, as a single user, mainly on my phone. No accounts, no sharing, no social features.

## 3. Goals

- **Fast comfort:** from tapping the home-screen icon to reading an affirmation in under 3 seconds, with no sign-in or lock screen in the way.
- **Personal meaning:** each affirmation can carry a note and a photo that make it feel true to me.
- **Easy upkeep:** adding or editing an affirmation takes under 30 seconds.
- **Never lose them:** a simple backup I can save and restore.

### Non-goals (for now)

- Syncing across devices or sign-in
- Notifications or reminders
- Voice recordings
- PIN or app lock
- Sharing affirmations with others

## 4. Platform

- A **web app** that works in a phone browser and on a laptop.
- **Installable** to the phone's home screen (Progressive Web App), opening full screen like a native app.
- **Works offline** after the first visit.
- All data is stored **only on the device** (in the browser's IndexedDB storage, which handles photos well).

## 5. Core concepts

| Concept | Description |
|---|---|
| **Theme** | A group for a kind of doubt, e.g. "Work", "Self-worth", "Anxiety". Has a name, a colour and an optional emoji. |
| **Affirmation** | Belongs to one theme. Has **text** (required), a **personal note** (optional) and a **photo** (optional). |

## 6. Features

### 6.1 Home: choose a theme
- Shows all themes as large, colourful tiles, each with its emoji, name and how many affirmations it holds.
- A **"Surprise me"** tile shuffles affirmations from every theme together.
- Tapping a tile opens the reading screen for that theme.

### 6.2 Reading screen (the heart of the app)
- One affirmation per **full-screen card**, in large bold text.
- If there's a photo, it fills the card behind or above the text, with the text kept readable.
- **Swipe left** (or tap the right side, or press → on a laptop) for the next card. **Swipe right** (or tap the left side, or ←) goes back.
- Tap **"Why this is true"** to reveal the personal note, if there is one.
- Cards are **shuffled into a new order every time** a theme is opened.
- After the last card, a gentle end screen offers **"Shuffle again"** or **"Back to themes"**.
- A small progress indicator (e.g. "3 of 8").
- An edit (pencil) button on each card to fix it on the spot.

### 6.3 Add and edit affirmations
- A clear **"+"** button on the home screen and inside each theme.
- Form fields: text (required), theme (picker, with the option to create a new theme right there), personal note (optional), photo (optional, from camera or photo library).
- Photos are resized on the device before saving so storage stays small.
- Delete an affirmation, with a confirmation step.

### 6.4 Manage themes
- Create, rename, recolour, change the emoji and delete themes.
- Deleting a theme that still has affirmations asks whether to move them to another theme or delete them too.
- Rearrange the order of theme tiles on the home screen.

### 6.5 Starter set
- On first open, the app comes with 3 themes and a few affirmations in each, all editable and deletable:
  - **Work:** "I've solved hard problems before, and I'll solve this one." · "My worth isn't measured by one bad day."
  - **Self-worth:** "I am enough as I am." · "I deserve the kindness I give to others."
  - **Anxiety:** "This feeling will pass." · "I can take this one breath at a time."

### 6.6 Backup and restore
- **Export:** saves one backup file (including photos) to the device.
- **Import:** restores from a backup file, with a choice to replace everything or merge.
- A gentle prompt in Settings shows when the last backup was made.

## 7. Look and feel

- **Pastel garden:** colourful but calm. Flat soft pastels (sage, blush, lavender, butter, sky, peach, rose) on a cream page, with no shadows or 3D effects. Each theme has its own colour.
- Headers (app name, screen titles, section and pop-up titles) in handwritten Homemade Apple; affirmations in a gentle serif (Lora); everything else in a rounded sans (Nunito).
- Smooth, gentle swipe animations.
- Works in light and dark mode. In dark mode the pastels become soft tints on a warm dark background.
- Big tap targets that are easy to hit in a stressful moment.

## 8. Requirements summary

| # | Requirement | Priority |
|---|---|---|
| R1 | Theme tiles on home screen, plus "Surprise me" | Must |
| R2 | Full-screen swipeable reading cards, shuffled each time | Must |
| R3 | Add, edit and delete affirmations (text, note, photo) | Must |
| R4 | Create, edit, delete and reorder themes | Must |
| R5 | Editable starter set on first open | Must |
| R6 | All data saved on the device; works offline | Must |
| R7 | Installable to phone home screen | Must |
| R8 | Export and import backup | Must |
| R9 | Keyboard arrows on laptop | Should |
| R10 | Light and dark mode | Should |

## 9. Success measures

- I open it in a moment of doubt and feel steadier after a few cards.
- I keep adding new affirmations over time.
- I've never lost an affirmation.

## 10. Risks

- **Data loss:** clearing the browser's data, or the browser removing it, deletes everything. Mitigated by backup/export and by asking the browser for persistent storage.
- **Phone storage:** many large photos could take up space. Mitigated by resizing photos on save.
- **One device only:** affirmations don't move between phone and laptop except via backup files.

## 11. Possible later additions

- Sync and sign-in
- Daily reminder notification
- Voice recordings
- Favourites
- Optional PIN lock
