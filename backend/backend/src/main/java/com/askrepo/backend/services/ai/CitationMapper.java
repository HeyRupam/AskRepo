package com.askrepo.backend.services.ai;

import java.util.List;

import org.springframework.ai.document.Document;
import org.springframework.stereotype.Component;

import com.askrepo.backend.dto.CitationDto;


import lombok.RequiredArgsConstructor;
import lombok.val;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;

@Component 
@RequiredArgsConstructor 
public class CitationMapper {

    private final JsonMapper jsonMapper;

    public CitationDto fromDocument(Document document){
        var meta = document.getMetadata();
        return new CitationDto(
            stringVal(meta.get("filepath")),
            invVal(meta.get("startLine")),
            invVal(meta.get("endLine")),
            stringVal(meta.get("language"))
        );
    }

    public String toJson(List<CitationDto> citations){
        try {
            return jsonMapper.writeValueAsString(citations);
        } catch (JacksonException e) {
            return "[]";
        }
    }

    private static String stringVal(Object value){
        return  value == null ? null : String.valueOf(value);
    }

   private static Integer invVal(Object value){
        if(value instanceof Number number){
            return number.intValue();
        }
        if(value == null){
            return null;
        }
        try{
            return Integer.parseInt(String.valueOf(value));
        } catch (NumberFormatException e){
            return null;
        }
   }
}
