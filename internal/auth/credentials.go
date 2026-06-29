// Package auth provides JWT-based authentication for the admin console. It
// handles token generation, validation, and context-based claim propagation.
package auth

import (
	"crypto/rand"
	"fmt"
	"math/big"
	"os"
	"strings"

	"golang.org/x/crypto/bcrypt"
)

const (
	credsFilePerm = 0600
	bcryptCost    = bcrypt.DefaultCost
)

// GenerateDefaultCredentials creates a random admin username (admin_XXXXX)
// and a 32-character alphanumeric password using crypto/rand.
func GenerateDefaultCredentials() (username, password string) {
	n, err := rand.Int(rand.Reader, big.NewInt(100000))
	if err != nil {
		n = big.NewInt(0)
	}
	username = fmt.Sprintf("admin_%05d", n.Int64())
	password = randomString(32)
	return
}

// GenerateRandomString generates a cryptographically random alphanumeric string
// of the given length using crypto/rand.
func GenerateRandomString(length int) string {
	return randomString(length)
}

// randomString generates a cryptographically random alphanumeric string of the
// given length.
func randomString(length int) string {
	const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, length)
	for i := range b {
		n, err := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
		if err != nil {
			b[i] = 'a'
			continue
		}
		b[i] = charset[n.Int64()]
	}
	return string(b)
}

// HashPassword returns a bcrypt hash of the given password.
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), bcryptCost)
	if err != nil {
		return "", err
	}
	return string(bytes), nil
}

// CheckPassword compares a password against a bcrypt hash. Returns true if
// they match.
func CheckPassword(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// SaveCredentials writes the username and password hash to the specified file
// in "username:hash\n" format. The file is created with 0600 permissions.
func SaveCredentials(path, username, passwordHash string) error {
	data := fmt.Sprintf("%s:%s\n", username, passwordHash)
	return os.WriteFile(path, []byte(data), credsFilePerm)
}

// LoadCredentials reads a credentials file in "username:hash\n" format and
// returns the username and password hash.
func LoadCredentials(path string) (username, passwordHash string, err error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return "", "", err
	}
	parts := strings.SplitN(strings.TrimSpace(string(data)), ":", 2)
	if len(parts) != 2 {
		return "", "", fmt.Errorf("auth: invalid credentials file format")
	}
	return parts[0], parts[1], nil
}

// PrintCredentialsToStdout prints a clear message with the generated admin
// credentials to stdout.
func PrintCredentialsToStdout(username, password string) {
	fmt.Println("========================================")
	fmt.Println("  Admin Console Credentials")
	fmt.Println("========================================")
	fmt.Printf("  Username: %s\n", username)
	fmt.Printf("  Password: %s\n", password)
	fmt.Println("========================================")
	fmt.Println("  Save these credentials securely!")
	fmt.Println("  They will not be shown again.")
	fmt.Println("========================================")
}
