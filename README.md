# Battle Puno

Battle Puno is a Nuxt application with a browser-based card game.

Project repository: [GitHub](https://github.com/RhymeJoy/puno)

## Rules

The rules page is available at `/rules` in the app. It includes English, 繁體中文, 简体中文, Français, 日本語, and 한국어 translations.

## Deploy to GitHub Pages

This project includes a GitHub Actions workflow at `.github/workflows/deploy-pages.yml`.
After pushing the repository to GitHub:

1. Open the repository's **Settings → Pages**.
2. Set **Source** to **GitHub Actions**.
3. Push to the `main` or `master` branch, or run **Deploy Battle Puno to GitHub Pages** manually from the **Actions** tab.

The workflow builds the Nuxt app as a static site and automatically applies the repository path required by GitHub Pages.

## Credits

- Kernel and UI by [ken1882](https://github.com/ken1882)
- Gameplay and rules by [WT-Cheng](https://github.com/wt-cheng)
- Resource credits: [credits.txt](./credits.txt)
