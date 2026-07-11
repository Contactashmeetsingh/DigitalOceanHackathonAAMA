# Local parser-validation samples

Real genome exports are intentionally excluded from Git by default. For local
parser regression checks, use open-consent files published by the Harvard
Personal Genome Project and keep the downloaded bytes under this directory
(the `.gitignore` excludes `*.txt` and `*.csv`). Do not use a teammate's
private genome as a demo fixture.

The July 11 local validation pass uses these PGP records because their listing
names identify three 23andMe chip generations:

| Generation label | PGP listing | Download page |
|---|---|---|
| v3 | `hu24385B`, `genome_hu24385B_v3_Full_20181019043936.zip` | https://my.pgp-hms.org/user_file/download/3595 |
| v4 | `huCC6D0B`, `genome_Brett_v4_Full_20181015201836.txt` | https://my.pgp-hms.org/user_file/download/3594 |
| v5 | `huE63257`, `genome_ARM_v5_Full_20191017170903.txt` | https://my.pgp-hms.org/user_file/download/3918 |

Source index: https://my.pgp-hms.org/public_genetic_data?data_type=23andMe

## Committed exception: `genome_Lorena_Sandoval_v5_Full_20260429131650.txt`

Confirmed by the project owner as a verified open-consent PGP record, in the
same v5-chip family as `huE63257`/ARM above. Unlike the three files listed
above, this one is force-added and committed to Git (`git add -f`) at the
project owner's explicit request, so the live demo does not depend on judges
downloading a separate file. *(PGP listing ID / download page not yet
recorded here — add it alongside the others above when available, for the
same citation consistency.)*

These files validate format and coverage behavior only. Their PGP profile text
must not be converted into an ancestry label, and the app must never infer a
population label from their genotypes. The demo’s optional broad label is a
separate, user-supplied field.
