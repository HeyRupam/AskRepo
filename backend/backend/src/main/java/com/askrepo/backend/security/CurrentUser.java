package com.askrepo.backend.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import com.askrepo.backend.exceptions.UnauthorizedException;

@Component
public class CurrentUser {
    public AppUserPrincipal require() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof AppUserPrincipal principal)) {
            throw new UnauthorizedException("No authenticated user");
        }
        return principal;
    }
}
