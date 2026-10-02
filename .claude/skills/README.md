# Skills del proyecto

Skills de terceros instalados para Claude Code. Se cargan automáticamente al abrir
este repositorio en Claude Code (terminal, escritorio o web).

| Origen | Commit | Licencia | Skills |
|---|---|---|---|
| [emilkowalski/skills](https://github.com/emilkowalski/skills) | `e8a175d` | MIT | animate, animate-expo, animation-vocabulary, apple-design, ask-sonner, break-ui, emil-design-eng, find-animation-opportunities, improve-animations, mobile-native, pick-ui-library, prototype, review-animations, write-swift |
| [leonxlnx/taste-skill](https://github.com/leonxlnx/taste-skill) | `ce26fc2` | MIT | design-taste-frontend, design-taste-frontend-v1, high-end-visual-design, minimalist-ui, industrial-brutalist-ui, redesign-existing-projects, gpt-taste, stitch-design-taste, full-output-enforcement, image-to-code, imagegen-frontend-web, imagegen-frontend-mobile, brandkit |
| [pbakaus/impeccable](https://github.com/pbakaus/impeccable) | `508d7e8` (v4.5.0, motor 0.1.11) | Apache 2.0 | impeccable (+ 4 subagentes en `.claude/agents/`) |

Cada carpeta conserva el archivo de licencia de su autor. Los nombres de carpeta
coinciden con el campo `name:` de cada SKILL.md, igual que el instalador
`npx skills add`.

## Notas

- **Impeccable** ejecuta un motor propio (`impeccable/scripts/impeccable`) que se descarga
  la primera vez desde las releases oficiales de GitHub a `~/.impeccable/bin/`.
- **No se instalaron los hooks automáticos de Impeccable** (revisión de diseño después de
  cada edición y al terminar cada turno). Son opcionales; para activarlos:
  `npx impeccable install --providers=claude --scope=project`.
- Los skills de imagen (`imagegen-*`, `image-to-code`, `brandkit`) requieren una
  herramienta de generación de imágenes en el entorno.

## Actualizar

```bash
npx skills@latest add emilkowalski/skills
npx skills add https://github.com/Leonxlnx/taste-skill
npx impeccable update
```
