package uk.co.uworx.khoji.agile.service.business;


import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import uk.co.uworx.khoji.agile.handler.ConfigHandler;
import uk.co.uworx.khoji.agile.internal.error.ServiceError;
import uk.co.uworx.khoji.agile.internal.error.ServiceException;
import uk.co.uworx.khoji.agile.internal.model.KhojiUserStatus;
import uk.co.uworx.khoji.agile.persistence.model.InstanceFeature;
import uk.co.uworx.khoji.agile.persistence.model.KhojiUser;
import uk.co.uworx.khoji.agile.persistence.model.UserAccess;
import uk.co.uworx.khoji.agile.persistence.model.Workspace;
import uk.co.uworx.khoji.agile.persistence.service.InstanceFeatureDataService;
import uk.co.uworx.khoji.agile.persistence.service.InstanceUserDataService;
import uk.co.uworx.khoji.agile.persistence.service.KhojiUserDataService;
import uk.co.uworx.khoji.agile.persistence.service.UserAccessDataService;
import uk.co.uworx.khoji.agile.persistence.service.WorkspaceDataService;
import uk.co.uworx.khoji.agile.response.InstanceResponse;
import uk.co.uworx.khoji.agile.response.WorkspaceResponse;

import java.security.Principal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Objects;

@Service
@Log4j2
public class WorkSpaceService
{
    @Autowired
    private UserAccessDataService userAccessDataService;
    @Autowired
    private WorkspaceDataService workspaceDataService;
    @Autowired
    private KhojiUserDataService khojiUserDataService;
    @Autowired
    private InstanceUserDataService instanceUserDataService;
    @Autowired
    private InstanceFeatureDataService instanceFeatureDataService;
    @Autowired
    private ConfigHandler configHandler;

    public Workspace createNewWorkSpace(Workspace workSpace, Principal principal)
    {
        throw new ServiceException(ServiceError.G0100);
        // add repository logic to create the new instance
    }

    public List<WorkspaceResponse> getAllWorkSpaces(Principal principal)
    {
        try
        {
            KhojiUser user = khojiUserDataService
                .findByEmail(principal.getName())
                .orElseThrow(() -> {
                    log.error("User not found against email: {}", principal.getName());
                    return new ServiceException(ServiceError.U0404);
                });

            // Fetch all workspaces owned by the user
            List<Workspace> ownedWorkspaces = workspaceDataService.findByOwner(user);

            List<UserAccess> userAccesses = userAccessDataService.findByEmail(principal.getName());

            List<InstanceResponse> instanceResponseList = new ArrayList<>();

            for (UserAccess userAccess : userAccesses)
            {
                if (!userAccess.getInstanceUser().getStatus().equalsIgnoreCase(KhojiUserStatus.REVOKED.name()))
                {
                    instanceResponseList.add(
                        new InstanceResponse(
                            userAccess.getInstanceUser(),
                            userAccess.getInstance(),
                            userAccessDataService
                                .findByInstanceId(userAccess.getInstance().getId())
                                .size(),
                            instanceUserDataService
                                .findInstanceUsersByInstanceId(userAccess.getInstance().getId())
                                .stream()
                                .filter(users -> !users.getStatus().equals(KhojiUserStatus.REVOKED.name()))
                                .toList()
                                .size(),
                            configHandler.fetchKhojiComponentsAndLimitations(
                                new HashMap<>()
                            ),
                            instanceFeatureDataService
                                .findAllByInstance(userAccess.getInstance())
                                .stream()
                                .map(InstanceFeature::getFeature)
                                .toList(),
                            !Objects.equals(
                                userAccess.getInstance().getWorkspace().getId(),
                                ownedWorkspaces.get(0).getId()
                            ),
                            userAccess.getInstance().getWorkspace().getOwner()
                        )
                    );
                }
            }

            List<WorkspaceResponse> workspaceResponses = new ArrayList<>();
            workspaceResponses.add(
                new WorkspaceResponse(
                    ownedWorkspaces.get(0).getId(),
                    ownedWorkspaces.get(0).getWorkspaceName(),
                    instanceResponseList
                )
            );
            return workspaceResponses;
        }
        catch (Exception e)
        {
            log.error("Something went wrong fetching workspaces for user: {}", e.getMessage());
            log.error(e);
            throw new RuntimeException(e);
        }
    }
}
