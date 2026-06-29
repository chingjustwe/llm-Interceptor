// Package auth provides JWT-based authentication for the admin console. It
// handles token generation, validation, and context-based claim propagation.
package auth

import (
	"context"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Claims holds the JWT claims for admin authentication.
type Claims struct {
	jwt.RegisteredClaims
	Username string `json:"username"`
	Role     string `json:"role"`
}

// GenerateToken creates a signed HS256 JWT token for the given username and role.
// Returns the token string and the expiry time.
func GenerateToken(username, role, secret string, expiry time.Duration) (string, time.Time, error) {
	exp := time.Now().Add(expiry)
	claims := &Claims{
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(exp),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
		Username: username,
		Role:     role,
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenStr, err := token.SignedString([]byte(secret))
	if err != nil {
		return "", time.Time{}, err
	}
	return tokenStr, exp, nil
}

// ValidateToken parses and validates a JWT token string. Returns the claims
// if the token is valid, or an error otherwise.
func ValidateToken(tokenStr, secret string) (*Claims, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (any, error) {
		return []byte(secret), nil
	})
	if err != nil {
		return nil, err
	}
	if !token.Valid {
		return nil, jwt.ErrSignatureInvalid
	}
	return claims, nil
}

type contextKey string

const userContextKey contextKey = "auth_user"

// ContextWithUser stores the given claims in the context.
func ContextWithUser(ctx context.Context, claims *Claims) context.Context {
	return context.WithValue(ctx, userContextKey, claims)
}

// UserFromContext extracts claims from the context. Returns nil if no claims
// are present.
func UserFromContext(ctx context.Context) *Claims {
	claims, _ := ctx.Value(userContextKey).(*Claims)
	return claims
}
