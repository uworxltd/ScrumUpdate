package uk.co.uworx.khoji.agile.internal.model;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * TODO: This Issue type is used for burnup only.
 * In the future, we will rename it and use
 * name IssueType for KhojiIssueType.java
 */
public class IssueType
{
  private String label;
  private String value;
  private Integer count;
  private Set<String> keys;
  private List<IssueType> children = new ArrayList<IssueType>();
  private String id;

  public IssueType()
  {
    this.count = 1;
  }

  public IssueType(String label, String value, List<IssueType> children, String key, String id)
  {
    this.label = label;
    this.value = value;
    this.count = 1;
    this.children = children;
    this.id = id;

    keys = new HashSet<>();
    if (key != null)
    {
      keys.add(key);
    }
  }

  public void setKeys(Set<String> keys)
  {
    this.keys = keys;
  }

  public void IncrementCount()
  {
    count += 1;
  }

  public void IncrementCount(String key)
  {
    if (keys == null)
    {
      keys = new HashSet<>();
    }
    if (!keys.contains(key))
    {
      IncrementCount();
      if (key != null)
      {
        keys.add(key);
      }
    }
  }

  public String getLabel()
  {
    return label;
  }

  public void setLabel(String value)
  {
    this.label = value;
  }

  public String getValue()
  {
    return value;
  }

  public void setValue(String value)
  {
    this.value = value;
  }

  public Integer getCount()
  {
    return count == 0 ? keys.size() : count;
  }

  public void setCount(Integer count)
  {
    this.count = count;
  }

  public List<IssueType> getChildren()
  {
    return children;
  }

  public void setChildren(List<IssueType> value)
  {
    this.children = value;
  }

  public Set<String> getKeys()
  {
    return keys;
  }

  public String getId()
  {
    return id;
  }

  @Override
  public boolean equals(Object obj)
  {
    return this.getValue() == ((IssueType) obj).getValue();
  }

  @Override
  public String toString()
  {
    return this.getValue();
  }
}
