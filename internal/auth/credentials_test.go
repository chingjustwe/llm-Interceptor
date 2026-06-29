// Package auth_test tests credential generation, hashing, and file persistence.
package auth_test

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/chingjustwe/llm-interceptor/internal/auth"
)

func TestGenerateDefaultCredentials(t *testing.T) {
	username, password := auth.GenerateDefaultCredentials()
	if !strings.HasPrefix(username, "admin_") {
		t.Errorf("expected username to start with admin_, got %s", username)
	}
	if len(password) != 32 {
		t.Errorf("expected password length 32, got %d", len(password))
	}
}

func TestHashAndCheckPassword(t *testing.T) {
	password := "my-secure-password-123!"
	hash, err := auth.HashPassword(password)
	if err != nil {
		t.Fatalf("HashPassword failed: %v", err)
	}
	if hash == "" {
		t.Fatal("expected non-empty hash")
	}
	if !auth.CheckPassword(password, hash) {
		t.Fatal("expected CheckPassword to return true for correct password")
	}
	if auth.CheckPassword("wrong-password", hash) {
		t.Fatal("expected CheckPassword to return false for wrong password")
	}
}

func TestSaveAndLoadCredentials(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "admin.credentials")
	hash, _ := auth.HashPassword("test-pass")
	if err := auth.SaveCredentials(path, "admin_test", hash); err != nil {
		t.Fatalf("SaveCredentials failed: %v", err)
	}
	loadedUser, loadedHash, err := auth.LoadCredentials(path)
	if err != nil {
		t.Fatalf("LoadCredentials failed: %v", err)
	}
	if loadedUser != "admin_test" {
		t.Errorf("expected username admin_test, got %s", loadedUser)
	}
	if loadedHash != hash {
		t.Errorf("hash mismatch")
	}
}

func TestLoadCredentials_InvalidFormat(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "bad.creds")
	os.WriteFile(path, []byte("no-colon-here\n"), 0600)
	_, _, err := auth.LoadCredentials(path)
	if err == nil {
		t.Fatal("expected error for invalid credentials format")
	}
}

func TestGenerateRandomString(t *testing.T) {
	s := auth.GenerateRandomString(16)
	if len(s) != 16 {
		t.Errorf("expected length 16, got %d", len(s))
	}
	for _, c := range s {
		if !strings.ContainsRune("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", c) {
			t.Errorf("unexpected character %c in random string", c)
		}
	}
}
