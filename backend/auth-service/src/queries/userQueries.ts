const queries = {
  login: `
    SELECT "userID", "userName", "email", "role", "password"
    FROM "users" 
    WHERE email = $1
  `,

  getAllUsers: `
    SELECT "userID", "userName", "email", "role" 
    FROM "users"
  `,

  createUser: `
    INSERT INTO "users" ("userName", "password", "email", "role") 
    VALUES ($1, $2, $3, $4) 
    RETURNING "userID", "userName", "email", "role"
  `,

  checkEmail: `
    SELECT email FROM "users" 
    WHERE email = $1
  `,

  checkRole: `
    SELECT role FROM "users" 
    WHERE email = $1
  `,

  validateUser: `
    SELECT "userID", role FROM "users" 
    WHERE email = $1
  `,

  deleteUser: `
    DELETE FROM "users" 
    WHERE "userID" = $1 
    RETURNING "userID"
  `,

  updateUserBase: `
    UPDATE "users" SET %s 
    WHERE "userID" = $%i 
    RETURNING "userID", "userName", "email", "role"
  `,
};

export default queries;
