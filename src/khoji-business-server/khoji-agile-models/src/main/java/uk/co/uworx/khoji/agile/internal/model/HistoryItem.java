package uk.co.uworx.khoji.agile.internal.model;

public class HistoryItem {
    private String historyItemId;
    private String field;
    private String fieldtype;
    private String from;
    private String fromString;
    private String to;
    private String toString;
    private String fieldId;
    private  String tmpFromAccountId;
    private String tmpToAccountId;

    public String getHistoryItemId()
    {
        return historyItemId;
    }

    public void setHistoryItemId(String historyItemId)
    {
        this.historyItemId = historyItemId;
    }

    public String getField() {
        return field;
    }

    public void setField(String field) {
        this.field = field;
    }

    public String getFieldtype() {
        return fieldtype;
    }

    public void setFieldtype(String fieldtype) {
        this.fieldtype = fieldtype;
    }

    public String getFrom() {
        return from;
    }

    public void setFrom(String from) {
        this.from = from;
    }

    public String getFromString() {
        return fromString;
    }

    public void setFromString(String fromString) {
        this.fromString = fromString;
    }

    public String getTo() {
        return to;
    }

    public void setTo(String to) {
        this.to = to;
    }

    public String getToString() {
        return toString;
    }

    public void setToString(String toString) {
        this.toString = toString;
    }

    public String getFieldId()
    {
        return fieldId;
    }

    public void setFieldId(String fieldId)
    {
        this.fieldId = fieldId;
    }

    public String getTmpFromAccountId()
    {
        return tmpFromAccountId;
    }

    public void setTmpFromAccountId(String tmpFromAccountId)
    {
        this.tmpFromAccountId = tmpFromAccountId;
    }

    public String getTmpToAccountId()
    {
        return tmpToAccountId;
    }

    public void setTmpToAccountId(String tmpToAccountId)
    {
        this.tmpToAccountId = tmpToAccountId;
    }
}
