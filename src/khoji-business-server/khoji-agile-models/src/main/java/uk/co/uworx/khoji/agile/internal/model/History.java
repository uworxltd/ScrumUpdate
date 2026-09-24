package uk.co.uworx.khoji.agile.internal.model;

import java.util.List;

public class History {
    private String historyId;
    private String dateCreated;
    private List<HistoryItem> historyItems;

    public String getDateCreated() {
        return dateCreated;
    }

    public void setDateCreated(String dateCreated) {
        this.dateCreated = dateCreated;
    }

    public List<HistoryItem> getHistoryItems() {
        return historyItems;
    }

    public void setHistoryItems(List<HistoryItem> historyItems) {
        this.historyItems = historyItems;
    }

    public String getHistoryId()
    {
        return historyId;
    }

    public void setHistoryId(String historyId)
    {
        this.historyId = historyId;
    }

}
