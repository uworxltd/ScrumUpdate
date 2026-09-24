package uk.co.uworx.khoji.agile.persistence.projection;

public interface TeamProjection {
    Long getId();
    String getTeamName();
    String getMembers();
    String getSupervisors();
}