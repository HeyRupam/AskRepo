package com.askrepo.backend.dto;

import java.util.UUID;

import com.askrepo.backend.entity.User;

public record UserResponse(
        UUID id,
        Long githubId,
        String githubUsername,
        String displayName,
        String avatarUrl) {

}
