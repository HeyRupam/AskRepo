package com.askrepo.backend.services.github;


import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.nio.charset.StandardCharsets;

import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class GithubApiClient {

    private static final String API_BASE = "https://api.github.com";
    private static final ParameterizedTypeReference<List<Map<String, Object>>> LIST_MAP=new ParameterizedTypeReference<List<Map<String,Object>>>(){

    };
    private static final ParameterizedTypeReference<Map<String, Object>> MAP=new ParameterizedTypeReference<Map<String,Object>>(){

    };

    private final RestClient.Builder restClinentBuilder;

    public List<Map<String, Object>> listUserRepos(String accessToken){
        List<Map<String, Object>> all = new ArrayList<>();
        int page = 1;
        while(page <= 10){
            final int currentPage = page;
            List<Map<String, Object>> pageResult = client(accessToken)
                .get()
                .uri(uriBuilder -> uriBuilder
                    .path("/user/repos")
                    .queryParam("affiliation", "owner,collaborator,organization_member")
                    .queryParam("sort", "updated")
                    .queryParam("per_page", 100)
                    .queryParam("page", currentPage)
                    .build())
                .retrieve()
                .body(LIST_MAP);
            if (pageResult == null || pageResult.isEmpty()) {
                break;
            }
            all.addAll(pageResult);
            if(pageResult.size() < 100){
                break;
            }
            page++;
        }
        return all;
    }

    public Map<String, Object> getRepoTree(String accessToken, String owner, String repo, String branch){
        return client(accessToken)
            .get()
            .uri(uriBuilder -> uriBuilder
                .path("/repos/{owner}/{repo}/get/trees/{branch}?recursive=1")
                .build(owner, repo, branch))
            .retrieve()
            .body(MAP);
    }

    public String getFileContent(String accessToken, String owner, String repo, String path, String ref){
        Map<String, Object> result = client(accessToken)
            .get()
            .uri(uriBuilder -> uriBuilder
                .path("/repos/{owner}/{repo}/contents/{path}")
                .queryParam("ref", ref)
                .build(owner, repo, path))
            .retrieve()
            .body(MAP);
        if(result == null || !result.containsKey("content")){
            return null;
        }
        Object encoding = result.get("encoding");
        Object content = result.get("content");
        if(encoding == null || content == null){
            return null;
        }
        if("base64".equals(encoding.toString())){
            String raw = String .valueOf(content).replaceAll("\\s", "");
            return new String(Base64.getDecoder().decode(raw), StandardCharsets.UTF_8);
        }   
        return String.valueOf(content);
    }

    private RestClient client(String accessToken){
        return restClinentBuilder
            .baseUrl(API_BASE)
            .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
            .defaultHeader(HttpHeaders.ACCEPT, "application/vnd.github+json")
            .defaultHeader(HttpHeaders.USER_AGENT, "AskRepo")
            .defaultHeader("X-GitHub-Api-Version", "2022-11-28")
            .build();
    }
}