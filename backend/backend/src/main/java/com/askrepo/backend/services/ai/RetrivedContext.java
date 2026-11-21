package com.askrepo.backend.services.ai;

import java.util.List;

import com.askrepo.backend.dto.CitationDto;

public record RetrivedContext(
    List<CitationDto> citations,
    String contextText
) {
     
}
