package com.askrepo.backend.services;

import java.util.Map;
import java.util.UUID;

import org.springframework.security.crypto.encrypt.TextEncryptor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.askrepo.backend.entity.User;
import com.askrepo.backend.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class UserServices {
    public final UserRepository userRepository;
    public final TextEncryptor tokenEncryptor;

    @Transactional
    public User upsertFromGithub(Map<String, Object> attributes, String accessToken,
            String scopes) {
        Long githubId = ((Integer) attributes.get("id")).longValue();
        String login = (String) attributes.get("login");
        String name = (String) attributes.get("name") != null ? (String) attributes.get("name") : login;
        String avatarUrl = (String) attributes.get("avatar_url") != null ? (String) attributes.get("avatar_url") : "";

        String encryptionToken = tokenEncryptor.encrypt(accessToken);

        User user = userRepository.findByGithubId(githubId).orElseGet(() -> {
            User newUser = new User();
            newUser.setGithubId(githubId);
            newUser.setGithubUsername(login);
            newUser.setDisplayName(name);
            newUser.setAvatarUrl(avatarUrl);
            newUser.setAccessToken(encryptionToken);
            newUser.setTokenScopes(encryptToken(scopes));
            return newUser;
        });

        if (user.getAccessToken() == null || !tokenEncryptor.decrypt(user.getAccessToken()).equals(accessToken)) {
            user.setAccessToken(encryptionToken);
            user.setTokenScopes(encryptToken(scopes));
        }

        return userRepository.save(user);
    }

    @Transactional(readOnly = true)
    public User requiredById(UUID id) {
        return userRepository.findById(id).orElseThrow(() -> new RuntimeException("User not found"));
    }

    public String encryptToken(String token) {
        return tokenEncryptor.encrypt(token);
    }

    public String decryptToken(String token) {
        return tokenEncryptor.decrypt(token);
    }

    private User encryptUser(User user) {
        user.setAccessToken(encryptToken(user.getAccessToken()));
        user.setTokenScopes(encryptToken(user.getTokenScopes()));
        return user;
    }

    public String decryptAccessToken(User user) {
        return tokenEncryptor.decrypt(user.getAccessToken());
    }

    private static Long toLong(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        return Long.parseLong(String.valueOf(value));
    }

}
