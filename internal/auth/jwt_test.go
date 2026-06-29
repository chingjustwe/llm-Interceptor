// Package auth_test tests JWT token generation, validation, and context propagation.
package auth_test

import (
	"context"
	"testing"
	"time"

	"github.com/chingjustwe/llm-interceptor/internal/auth"
)

func TestGenerateAndValidateToken(t *testing.T) {
	secret := "test-secret-key-min-32-chars!!!!!!!!"
	tokenStr, exp, err := auth.GenerateToken("admin_user", "admin", secret, time.Hour)
	if err != nil {
		t.Fatalf("GenerateToken failed: %v", err)
	}
	if tokenStr == "" {
		t.Fatal("expected non-empty token")
	}
	if exp.Before(time.Now().Add(50 * time.Minute)) {
		t.Fatal("expiry too soon")
	}

	claims, err := auth.ValidateToken(tokenStr, secret)
	if err != nil {
		t.Fatalf("ValidateToken failed: %v", err)
	}
	if claims.Username != "admin_user" {
		t.Errorf("expected username admin_user, got %s", claims.Username)
	}
	if claims.Role != "admin" {
		t.Errorf("expected role admin, got %s", claims.Role)
	}
}

func TestValidateToken_InvalidSecret(t *testing.T) {
	secret := "test-secret-key-min-32-chars!!!!!!!!"
	tokenStr, _, err := auth.GenerateToken("admin", "admin", secret, time.Hour)
	if err != nil {
		t.Fatalf("GenerateToken failed: %v", err)
	}

	_, err = auth.ValidateToken(tokenStr, "wrong-secret-min-32-chars!!!!!!")
	if err == nil {
		t.Fatal("expected error with wrong secret")
	}
}

func TestValidateToken_Expired(t *testing.T) {
	secret := "test-secret-key-min-32-chars!!!!!!!!"
	tokenStr, _, err := auth.GenerateToken("admin", "admin", secret, -time.Hour)
	if err != nil {
		t.Fatalf("GenerateToken failed: %v", err)
	}

	_, err = auth.ValidateToken(tokenStr, secret)
	if err == nil {
		t.Fatal("expected error for expired token")
	}
}

func TestValidateToken_BadFormat(t *testing.T) {
	secret := "test-secret-key-min-32-chars!!!!!!!!"
	_, err := auth.ValidateToken("garbage-token-string", secret)
	if err == nil {
		t.Fatal("expected error for garbage token")
	}
}

func TestContextWithUserAndUserFromContext(t *testing.T) {
	ctx := auth.ContextWithUser(context.Background(), &auth.Claims{Username: "test-user", Role: "viewer"})
	claims := auth.UserFromContext(ctx)
	if claims == nil {
		t.Fatal("expected non-nil claims")
	}
	if claims.Username != "test-user" {
		t.Errorf("expected username test-user, got %s", claims.Username)
	}
	if claims.Role != "viewer" {
		t.Errorf("expected role viewer, got %s", claims.Role)
	}
}

func TestUserFromContext_Empty(t *testing.T) {
	claims := auth.UserFromContext(context.Background())
	if claims != nil {
		t.Fatal("expected nil claims from context without claims")
	}
}
