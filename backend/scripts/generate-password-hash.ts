import "dotenv/config";
import * as argon2 from "argon2";

const password = process.env.RECOVERY_PASSWORD;
const email = process.env.RECOVERY_EMAIL?.trim().toLocaleLowerCase("uk-UA");

async function main() {
  if (!password || password.length < 12) {
    throw new Error(
      "Set RECOVERY_PASSWORD to a new password with at least 12 characters",
    );
  }
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
  console.log(
    "Copy the hash below into a parameterized database query. Do not store the plaintext password.",
  );
  console.log(`password_hash: ${passwordHash}`);
  if (email) {
    console.log(
      "\nExample SQL (run it only after confirming the target email):",
    );
    console.log(
      `UPDATE [dbo].[users] SET [password_hash] = N'${passwordHash}', [must_change_password] = 0, [updated_at] = SYSUTCDATETIME() WHERE [normalized_email] = N'${email.replace(/'/g, "''")}';`,
    );
  }
}

void main();
