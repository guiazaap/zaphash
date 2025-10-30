# ZapHash Screenshot Bot

Entrada: `postUrl` (ex.: https://www.instagram.com/p/DQPA_dDkcSp/)
Saída: envia `{ID}.png` via SFTP para `wp-content/uploads/zaphash/`.

Segredos (Settings > Secrets > Actions):
- `SFTP_HOST` (ex.: zaap.blog)
- `SFTP_USER`
- `SFTP_PASS`
- `SFTP_PATH` = /public_html/wp-content/uploads/zaphash/
- `SFTP_PUBLIC_PREFIX` = /wp-content/uploads/zaphash/
